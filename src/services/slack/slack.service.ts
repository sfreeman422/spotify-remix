import { Block, KnownBlock, WebAPICallResult, WebClient } from '@slack/web-api';
import { SongWithUserData } from '../spotify/spotify.interface';

export class SlackService {
  web: WebClient = new WebClient(process.env.MUZZLE_BOT_TOKEN);

  public buildMessage(orderedPlaylist: SongWithUserData[]) {
    let message = '';

    orderedPlaylist.forEach((song, index) => {
      message = message.concat(
        `${index + 1}. ${song.spotifyId} - ${song.artists.map(x => x.name).join(', ')} - ${song.name}\n`,
      );
    });

    const blocks: KnownBlock[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `:headbangingparrot: _Da Bros' Remix has been successfully refreshed_ :headbangingparrot:`,
          },
        ],
      },
    ];
    return blocks;
  }

  public sendMessage(channel: string, text: string, blocks?: Block[] | KnownBlock[]): Promise<WebAPICallResult> {
    const token: string | undefined = process.env.MUZZLE_BOT_USER_TOKEN;
    console.log('attempting to send slack message', { channel, text, blocks });
    // This is actually ChatPostMessageArguments but some weird behavior occuring.,
    const postRequest: any = {
      token,
      channel,
      text,
    };

    if (blocks) {
      postRequest.blocks = blocks;
    }

    return this.web.chat
      .postMessage(postRequest)
      .then(result => {
        return result;
      })
      .catch(e => {
        console.error(e);
        console.error(e.data);
        console.log(postRequest);
        throw e;
      });
  }
}
