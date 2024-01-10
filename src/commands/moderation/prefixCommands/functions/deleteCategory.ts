import { ChatInputCommandInteraction, Colors, TextChannel, User } from 'discord.js';
import { constantsConfig, getConn, PrefixCommandCategory, Logger, makeEmbed } from '../../../../lib';

const noConnEmbed = makeEmbed({
    title: 'Prefix Commands - Delete Category - No Connection',
    description: 'Could not connect to the database. Unable to delete the prefix command category.',
    color: Colors.Red,
});

const failedEmbed = (categoryId: string) => makeEmbed({
    title: 'Prefix Commands - Delete Category - Failed',
    description: `Failed to delete the prefix command category with id ${categoryId}.`,
    color: Colors.Red,
});

const doesNotExistsEmbed = (categoryId: string) => makeEmbed({
    title: 'Prefix Commands - Delete Category - Does not exist',
    description: `The prefix command category with id ${categoryId} does not exists. Can not delete it.`,
    color: Colors.Red,
});

const successEmbed = (category: string, categoryId: string) => makeEmbed({
    title: `Prefix command category ${category} (${categoryId}) was deleted successfully.`,
    color: Colors.Green,
});

const modLogEmbed = (moderator: User, category: string, emoji: string, categoryId: string) => makeEmbed({
    title: 'Prefix command category deleted',
    fields: [
        {
            name: 'Category',
            value: category,
        },
        {
            name: 'Moderator',
            value: `${moderator}`,
        },
        {
            name: 'Emoji',
            value: emoji,
        },
    ],
    footer: { text: `Category ID: ${categoryId}` },
    color: Colors.Red,
});

const noModLogs = makeEmbed({
    title: 'Prefix Commands - Delete Category - No Mod Log',
    description: 'I can\'t find the mod logs channel. Please check the channel still exists.',
    color: Colors.Red,
});

export async function handleDeletePrefixCommandCategory(interaction: ChatInputCommandInteraction<'cached'>) {
    await interaction.deferReply({ ephemeral: true });

    const conn = getConn();
    if (!conn) {
        await interaction.followUp({ embeds: [noConnEmbed], ephemeral: true });
        return;
    }

    const categoryId = interaction.options.getString('id')!;
    const moderator = interaction.user;

    //Check if the mod logs channel exists
    const modLogsChannel = interaction.guild.channels.resolve(constantsConfig.channels.MOD_LOGS) as TextChannel;
    if (!modLogsChannel) {
        await interaction.followUp({ embeds: [noModLogs], ephemeral: true });
    }

    const existingCategory = await PrefixCommandCategory.findById(categoryId);

    if (existingCategory) {
        const { name, emoji } = existingCategory;
        try {
            await existingCategory.deleteOne();
            await interaction.followUp({ embeds: [successEmbed(name || '', categoryId)], ephemeral: true });
            if (modLogsChannel) {
                try {
                    await modLogsChannel.send({ embeds: [modLogEmbed(moderator, name || '', emoji || '', categoryId)] });
                } catch (error) {
                    Logger.error(`Failed to post a message to the mod logs channel: ${error}`);
                }
            }
        } catch (error) {
            Logger.error(`Failed to delete a prefix command category with id ${categoryId}: ${error}`);
            await interaction.followUp({ embeds: [failedEmbed(categoryId)], ephemeral: true });
        }
    } else {
        await interaction.followUp({ embeds: [doesNotExistsEmbed(categoryId)], ephemeral: true });
    }
}
