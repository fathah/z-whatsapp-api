import { Client,LocalAuth } from 'whatsapp-web.js';
import ZWAPIConfig from './configs';
import qrcode from "qrcode-terminal";

const waclient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
          args: [
            '--no-sandbox',
            '--disable-site-isolation-trials',
            '--disable-setuid-sandbox',
          ],
      },
      webVersionCache:{
        type: 'remote',
        remotePath: ZWAPIConfig.REMOTE_URL,
      }
}
);

waclient.on('qr', (qr) => {
  qrcode.generate(qr, {small: true});
  console.log(qr);
  
});

waclient.on('ready', () => {
  console.log('⚡ Z-WAPI Client is ready!');
});

export default waclient;