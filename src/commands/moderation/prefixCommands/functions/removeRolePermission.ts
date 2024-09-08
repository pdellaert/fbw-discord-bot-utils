import { ChatInputCommandInteraction, Colors, TextChannel, User } from 'discord.js';
import { constantsConfig, getConn, PrefixCommand, Logger, makeEmbed } from '../../../../lib';

const noConnEmbed = makeEmbed({
    title: 'Prefix Commands - Remove Role Permission - No Connection',
    description: 'Could not connect to the database. Unable to remove the prefix command role permission.',
    color: Colors.Red,
});

const noCommandEmbed = (command: string) => makeEmbed({
    title: 'Prefix Commands - Remove Role Permission - No Command',
    description: `Failed to remove the prefix command role permission for command ${command} as the command does not exist or there are more than one matching.`,
    color: Colors.Red,
});

const failedEmbed = (command: string, roleName: string, type: string) => makeEmbed({
    title: 'Prefix Commands - Remove Role Permission - Failed',
    description: `Failed to remove the ${type} prefix command role permission for command ${command} and role ${roleName}.`,
    color: Colors.Red,
});

const doesNotExistEmbed = (command: string, roleName: string) => makeEmbed({
    title: 'Prefix Commands - Remove Role Permission - Already exists',
    description: `A prefix command role permission for command ${command} and role ${roleName} does not exist.`,
    color: Colors.Red,
});

const successEmbed = (command: string, roleName: string, type: string) => makeEmbed({
    title: `Prefix command role ${type} permission removed for command ${command} and role ${roleName}.`,
    color: Colors.Green,
});

const modLogEmbed = (moderator: User, command: string, roleName: string, type: string) => makeEmbed({
    title: 'Remove prefix command role permission',
    fields: [
        {
            name: 'Command',
            value: command,
        },
        {
            name: 'Role',
            value: roleName,
        },
        {
            name: 'Type',
            value: type,
        },
        {
            name: 'Moderator',
            value: `${moderator}`,
        },
    ],
    color: Colors.Green,
});

const noModLogs = makeEmbed({
    title: 'Prefix Commands - Remove Role Permission - No Mod Log',
    description: 'I can\'t find the mod logs role. Please check the role still exists.',
    color: Colors.Red,
});

export async function handleRemovePrefixCommandRolePermission(interaction: ChatInputCommandInteraction<'cached'>) {
    await interaction.deferReply({ ephemeral: true });

    const conn = getConn();
    if (!conn) {
        await interaction.followUp({ embeds: [noConnEmbed], ephemeral: true });
        return;
    }

    const command = interaction.options.getString('command')!;
    const role = interaction.options.getRole('role')!;
    const moderator = interaction.user;

    //Check if the mod logs role exists
    const modLogsRole = interaction.guild.channels.resolve(constantsConfig.channels.MOD_LOGS) as TextChannel;
    if (!modLogsRole) {
        await interaction.followUp({ embeds: [noModLogs], ephemeral: true });
    }

    let foundCommands = await PrefixCommand.find({ name: command });
    if (!foundCommands || foundCommands.length > 1) {
        foundCommands = await PrefixCommand.find({ aliases: { $in: [command] } });
    }
    if (!foundCommands || foundCommands.length > 1) {
        await interaction.followUp({ embeds: [noCommandEmbed(command)], ephemeral: true });
        return;
    }
    const [foundCommand] = foundCommands;
    const { id: roleId, name: roleName } = role;

    const existingRolePermission = foundCommand.rolePermissions.find((rolePermission) => rolePermission.roleId === roleId);
    if (existingRolePermission) {
        const { type } = existingRolePermission;
        try {
            foundCommand.rolePermissions.find((rolePermission) => rolePermission.roleId === roleId)?.deleteOne();
            await foundCommand.save();
            await interaction.followUp({ embeds: [successEmbed(command, roleName, type)], ephemeral: true });
            if (modLogsRole) {
                try {
                    await modLogsRole.send({ embeds: [modLogEmbed(moderator, command, roleName, type)] });
                } catch (error) {
                    Logger.error(`Failed to post a message to the mod logs role: ${error}`);
                }
            }
        } catch (error) {
            Logger.error(`Failed to remove ${type} prefix command role permission for command ${command} and role ${roleName}: ${error}`);
            await interaction.followUp({ embeds: [failedEmbed(command, roleName, type)], ephemeral: true });
        }
    } else {
        await interaction.followUp({ embeds: [doesNotExistEmbed(command, roleName)], ephemeral: true });
    }
}
