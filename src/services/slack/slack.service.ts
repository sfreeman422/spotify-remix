import { Block, KnownBlock, WebAPICallResult, WebClient } from '@slack/web-api';

export class SlackService {
  web: WebClient = new WebClient(process.env.MUZZLE_BOT_TOKEN);

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

    console.log('post request', postRequest);

    return this.web.chat
      .postMessage(postRequest)
      .then(result => {
        console.log('message sent', result);
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
