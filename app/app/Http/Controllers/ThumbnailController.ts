import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Puppeteer from 'puppeteer';
import crypto from 'crypto';

export default class ThumbnailController {
    public async index(ctx: HttpContextContract) {
        const queryParams = ctx.request.qs();
        if (!queryParams.url) {
            return ctx.response.status(401).send({ msg: "URLが指定されていません" })
        }

        const browser = await Puppeteer.launch({
            headless: true,
            executablePath: '/usr/bin/chromium-browser',
            slowMo: 50,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--enable-webgl',
                //'--use-gl=egl',
                '--use-gl=swiftshader',
                '--use-cmd-decoder=passthrough',
                '--enable-webgl2-compute-context',
                '--enable-webgl-image-chromium',
                '--enable-webgl-draft-extensions',
                '--gpu',
                '--hide-scrollbars',
                '--disable-gpu',
                '--single-process',
                '--no-first-run',
                '--no-zygote',
                '--ignore-gpu-blacklist',
            ]
        });

        const page = await browser.newPage();

        await page.setViewport({
            width: 1280,
            height: 960,
        });
        await page.goto(queryParams.url);
        await page.waitForTimeout(1000 * 10);

        const rect = await page.evaluate(() => {
            // @ts-ignore
            const rect = document.querySelector('#myCanvas').getBoundingClientRect();
            return {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            };
        });

        const hmac = crypto.createHmac('sha256', 'aaa');
        const t = (new Date()).getTime();
        hmac.update(t.toString() + queryParams.url);
        const fileName = hmac.digest('hex');
        const tmpFilePath = "/tmp/" + fileName + "_thumbnail.png";
        await page.screenshot({
            path: tmpFilePath,
            clip: rect,
            //fullPage: true
        });

        await browser.close();

        return ctx.response.download(tmpFilePath, true);
    }
}