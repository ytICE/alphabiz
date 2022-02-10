/* eslint-disable no-empty-pattern */
const { _electron: electron } = require('playwright')
const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')

const { Commands } = require('./models/commands')
const { getMailCode, sleep } = require('../utils/getCode')

let window, windows, electronApp, commands
const ScreenshotsPath = 'test/output/playwright/main.spec/'

test.beforeAll(async () => {
  // Launch Electron app.
  electronApp = await electron.launch({
    args: [
      '--inspect=5858',
      'build/electron/UnPackaged/electron-main.js'
    ]
  })
  // Evaluation expression in the Electron context.
  await electronApp.evaluate(async ({ app }) => {
    // This runs in the main Electron process, parameter here is always
    // the result of the require('electron') in the main app script.
    return app.getAppPath()
  })
  // Get the first window that the app opens, wait if necessary.
  window = await electronApp.firstWindow()

  await window.waitForTimeout(6000)
  // should main window
  windows = electronApp.windows()

  for (const win of windows) {
    if (await win.title() === 'Alphabiz') window = win
  }
  console.log('windows title:' + await window.title())
  // new Pege Object Model
  commands = new Commands(window)
})
test.beforeEach(async () => {
  await window.evaluate(() => localStorage.clear())
})
test.afterEach(async ({}, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    console.log(`Timeout! Screenshots => ${ScreenshotsPath}${testInfo.title}-retry-${testInfo.retry}-fail.png`)
    // await window.waitForTimeout(10000)
    await window.screenshot({ path: `${ScreenshotsPath}${testInfo.title}-retry-${testInfo.retry}-fail.png` })
  }
})
test.afterAll(async () => {
  // // Exit app.
  // await window.evaluate(() => localStorage.clear())

  // await electronApp.close()
})

test('window has correct title', async () => {
  const title = await window.title()
  expect(title).toContain('Alphabiz')
})
test('close set default', async () => {
  const notification = await window.locator('.q-notification__message >> text=Alphabiz is not')
  if (await notification.isVisible()) {
    const alert = await notification.innerText()
    console.log(alert)
    const targetAlert = 'DON\'T SHOW AGAIN'
    console.log(targetAlert)
    if (/Alphabiz is not your default app for torrent and media/.test(alert)) {
      await window.click('text=DON\'T SHOW AGAIN')
    }
    await notification.waitFor('hidden')
  }
})
test('reset torrent status', async () => {
  await window.waitForLoadState()
  await commands.jumpPage('downloadingStatus')
  if (await window.isVisible('button[role="button"]:has-text("Remove all")')) {
    await window.click('button[role="button"]:has-text("Remove all")')
    await window.click('[aria-label="Also delete files"]')
    await window.click('text=NOT NOW >> //following::*[1]')
  }
  await commands.jumpPage('uploadingStatus')
  if (await window.isVisible('button[role="button"]:has-text("Remove all")')) {
    await window.click('button[role="button"]:has-text("Remove all")')
    await window.click('[aria-label="Also delete files"]')
    await window.click('[aria-label="Remove auto-upload files"]')
    await window.click('text=NOT NOW >> //following::*[1]')
  }
  await commands.jumpPage('downloadedStatus')
  if (await window.isVisible('button[role="button"]:has-text("Clear history")')) {
    await window.click('button[role="button"]:has-text("Clear history")')
    await window.click('button[role="button"]:has-text("Remove all")')
  }
  // dev mode
  // await commands.jumpPage('developmentLink')
  // await window.click('text=Dev Info')
  // await window.click('text=Torrent Config Store >> //following-sibling::Button[2]')
  // await window.locator('text=Successfully reset torrents').waitFor('visible')
})
test.describe('play video', () => {
  test('avi_type', async () => {
    const media = './test/samples/GoneNutty.avi'

    await window.waitForLoadState()
    await commands.jumpPage('playerLink')
    // Upload
    await window.setInputFiles('[data-cy="file-input"]', media)
    await window.waitForLoadState()
    // should video can play
    const progressControl = await window.locator('.vjs-progress-control')
    await expect(progressControl).toBeVisible()
  })
  test('BluRay_type', async () => {
    const media = './test/samples/Test-Sample-Tenet.2020.IMAX.2160p.UHD.BluRay.x265.10bit.HDR.DTS-HD.MA.5.1202111171122322.mkv'

    if (await window.$('[data-cy="file-input"]') === null) await commands.jumpPage('playerLink')
    // Upload
    await window.setInputFiles('[data-cy="file-input"]', media)
    await window.waitForLoadState()
    // should video can play
    const progressControl = await window.locator('.vjs-progress-control')
    await expect(progressControl).toBeVisible()
  })
})

test.describe('download ', () => {
  const btData = [
    {
      btName: 'uTorrent Web Tutorial Video',
      magnetLink: 'magnet:?xt=urn:btih:61b3b8856c4839edf51f5c2346599b6bec524145',
      isDelete: 0,
      fileType: 'folder'
    },
    {
      btName: 'The WIRED CD - Rip. Sample. Mash. Share',
      magnetLink: 'magnet:?xt=urn:btih:a88fda5954e89178c372716a6a78b8180ed4dad3&dn=The+WIRED+CD+-+Rip.+Sample.+Mash.+Share&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F',
      isDelete: 0,
      fileType: 'folder'
    },
    // {
    //   btName: 'uTorrent Web Tutorial Video',
    //   magnetLink: 'alphabiz://uTorrent Web Tutorial Video/AWGzuIVsSDnt9R9cI0ZZm2vsUkFF&_Td6WFoAAAFpIt42AgAhARwAAAAQz1jM4AH2ANpdABhqCGEMasyA09lDwx5rYF469RTDhk8xcIgNnP2J3Ivpl6BRodn06md7iETYpqKJv8gUn0A0LmqilaAENBBniICpLKEQzrlwjLEB0AoBqsUX7B3_n1cTM2EgRritRAl8SXQxdiabEMBVepqe65AjYT61G49_IrPRbw2e3iwqxzOvN1eGDGHXRjnXXV1D1ZUDYrJPfpF_xVRVNZ+ck7O2J1gBcfJguA7o3tmFj54bURfeVnWZVBnBXGK4mmxorTFFWO+lwh7BLrQH6JYPmGMq8Um2Ui+HIlFnlVzLAAAAd8ehRwAB8gH3AwAAONWYvz4wDYsCAAAAAAFZWg==',
    //   testName: 'alphabiz- ',
    //   isDelete: 0
    // },
    {
      btName: 'bbb_sunflower_1080p_30fps_normal.mp4',
      magnetLink: 'alphabiz://bbb_sunflower_1080p_30fps_normal.mp4/AYhZSqrL3kDvPiUQxHN07AqjlsCO&_Td6WFoAAAFpIt42AgAhARwAAAAQz1jM4AMtAW1dABhgxG8IY8MSV1K_VKsx55jv8ahwgTX5jKB2up6HR8eDRb6BvCkztx6mgEb++b2O2b3K3oD_twGGSig+KBe78TiXxGleWSnbRlWB69ZvfD70oiEhlTlty+AtgRrH+kzx7fD910Bx9Uf4_7Js+dNII8l3GxJ4B175xFepPURPh6AnWzB9cVwPtgxmF4hSxh7Z_thhoZBH4KP2yrr9bIPbiBIfR4rnRGgQhoMYOe1vRpDVUFDC_y_tNp17fwwfvvvAj5elliGbJODzL4qEq_HB_lUhXHCZDoPbg1kCa8TfDkYL+2wWqViHW5YjR6DIxnlf8AAswdMmYa5OLaHRfCaqLtreJ_iohdSxAp2rckxS001Zp7ra+N_aIUxh9H3a96O2YBfWo_2PdmbBhT1A8s20u6d9cVtOTDvkpvOb8aiGcUn+swScBUm1SBP2DgoZJ6zeNvQcBQ9WKwD51ImdTrOxf2ShB64iMvUV0iO_3x3WAAAAAJcI4UEAAYUDrgYAAOI5sWM+MA2LAgAAAAABWVo=',
      testName: 'alphabiz- ',
      isDelete: 0,
      fileType: 'video_file'
    },
    {
      btName: 'sintel.mp4',
      isStreaming: 1,
      testName: 'Streaming ',
      magnetLink: 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d&dn=sintel.mp4&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel-1024-surround.mp4',
      isDelete: 0
    },
    {
      btName: 'sintel.mp4',
      isStreaming: 0,
      magnetLink: 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d&dn=sintel.mp4&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel-1024-surround.mp4',
      isDelete: 0,
      fileType: 'video_file'
    }
  ]
  for (const btDate of btData) {
    test((btDate.testName ? btDate.testName : '') + btDate.btName, async () => {
      if (btDate.btName === 'uTorrent Web Tutorial Video') {
        test.setTimeout(60000 * 5)
      } else if (btDate.btName === 'The WIRED CD - Rip. Sample. Mash. Share') {
        test.setTimeout(60000 * 10)
      } else if (btDate.btName === 'sintel.mp4') {
        test.setTimeout(60000 * 10)
      } else if (btDate.btName === 'bbb_sunflower_1080p_30fps_normal.mp4') {
        test.setTimeout(60000 * 15)
      }
      await window.waitForLoadState()
      const btCard = 'text=' + btDate.btName + ' >> xpath=..//..//..//..//..'

      // 跳转到 home
      await commands.jumpPage('downloadingStatus')

      await window.waitForTimeout(2000)
      // 等待任务卡片加载
      if (await window.$(btCard) == null) {
        await window.waitForTimeout(2000)
      }
      // download sintel.mp4 下载中状态多等一会
      if (btDate.btName === 'sintel.mp4' && btDate.isStreaming === 0) {
        let waitTime = 0
        while (1) {
          if (await window.$(btCard) == null) {
            waitTime += 3
          } else break
          if (waitTime >= 15) break
          await window.waitForTimeout(3000)
        }
      }

      // 判断 任务 在downloading状态
      if (await window.$(btCard) !== null) {
        // 等待下载完成
        const DownloadStatus = await (await window.$(btCard + ' >> text=Status:')).innerText()
        //  判断 文件存在，下载完成
        if (DownloadStatus === 'Status: Paused') await window.click(btCard + ' >> button[role="button"]:has-text("Resume")')
        try {
          await window.click(btCard + ' >> text=Status: Downloading', { timeout: 60000 })
        } catch (error) {
          await commands.jumpPage('uploadingStatus')
          await window.click(btCard + ' >> text=Status: Seeding', { timeout: 30000 })
        }
      } else {
        // 判断 任务 在seeding状态
        await commands.jumpPage('uploadingStatus')
        await window.waitForTimeout(1000)
        if (await window.$(btCard) === null) {
          // 任务不存在  bt未开始下载
          await commands.jumpPage('downloadingStatus')
          await commands.downloadTorrent(btDate.magnetLink)

          await window.click('text=' + btDate.btName, { timeout: 60000 })
          // 等待 任务 加载 验证， 判断任务是 下载中

          await window.click(btCard + ' >> text=Status: Downloading', { timeout: 60000 })
        }
      }

      // 等待下载完成
      const btStatus = await (await window.$(btCard + ' >> text=Status:')).innerText()
      if (btStatus === 'Status: Downloading') {
        const progressBar = await window.$(btCard + ' >> .progress-text')
        let oldProgress = parseFloat(/\d{1,3}.\d{0,2}/.exec(await progressBar.innerText()))
        let timestamp = 0
        // wait download
        while (1) {
          if (!(await window.$(btCard + ' >> text=Status:'))) break
          const DownloadStatus = await (await window.$(btCard + ' >> text=Status:')).innerText()
          // console.log('DownloadStatus:' + DownloadStatus)
          if (DownloadStatus !== 'Status: Downloading') {
            break
          }
          const progressBar = await window.$(btCard + ' >> .progress-text')
          const progressPercentage = parseFloat(/\d{1,3}.\d{0,2}/.exec(await progressBar.innerText()))
          // console.log('progressPercentage:' + progressPercentage)
          if (oldProgress === progressPercentage) {
            if (timestamp >= 40) break
            timestamp += 5
          } else if (oldProgress < progressPercentage) timestamp = 0

          oldProgress = progressPercentage
          if (btDate.btName === 'sintel.mp4' && btDate.isStreaming) {
            if (progressPercentage > 30) break
          }
          if (progressPercentage === 100) break

          await window.waitForTimeout(5000)
          continue
        }
      }
      if (btDate.isStreaming !== 1) await commands.jumpPage('uploadingStatus')
      // 点击 Play 按钮
      await window.click(btCard + ' >> button[role="button"]:has-text("play_arrowPLAY")')
      // 点击播放列表的第一个文件，跳转到player页面
      await window.click('.q-list > .q-item:nth-child(1)')

      // should video can play
      await window.waitForSelector('.vjs-progress-control', { timeout: 40000 })
      await window.reload()
      // 是否删除种子
      if (btDate.isDelete) {
        await commands.jumpPage('uploadingStatus')
        await window.click(btCard + ' >> button[role="button"]:has-text("Delete")')
        await window.click('[aria-label="Also delete files"]')
        await sleep(3000)
        await window.click('text=not now>> //following::Button[1]')
      }
    })
  }
  test.skip('table mode task lists', async () => {
    // 确保下载的全部种子都在做种状态
    // await commands.jumpPage('downloadedStatus')

    await commands.jumpPage('uploadingStatus')
    // 切换列表模式
    await window.click('button[role="button"]:has-text("view_agenda")')
    // 验证文件类型图标
    await sleep(2000)
    // 截图验证
    await window.screenshot({ path: `${ScreenshotsPath}taskStatus.png` })
    const bbbFileIcon = await window.locator('text=sintel.mp4 >> //preceding::*[1]').innerText()
    expect(bbbFileIcon).toBe('video_file')
    const uTorrentFileIcon = await window.locator('text=uTorrent Web >> //preceding::*[1]').innerText()
    expect(uTorrentFileIcon).toBe('folder')
    // uploading状态栏
    // 双击文件名播放文件
    await window.locator('text=The WIRED CD - Rip. Sample. Mash. Share').click({ clickCount: 2 })
    // should video can play
    await window.waitForSelector('.vjs-progress-control', { timeout: 10000 })
    await commands.jumpPage('uploadingStatus')
    await sleep(1000)
    await window.screenshot({ path: `${ScreenshotsPath}taskStatus3.png` })
    // 文件大小
    const fileSize = await window.locator('text=The WIRED CD - Rip. Sample. Mash. Share >> //following::*[2]').innerText()
    // expect(fileSize).toBe('56.07 MB')
    expect(/\d+\.\d+\s(MB|GB)/.test(fileSize)).toBe(true)
    // 完成时间格式 hh:mm:ss格式 非当日任务显示yesterday或yy-mm-dd格式
    const time = await window.locator('text=The WIRED CD - Rip. Sample. Mash. Share >> //following::*[3]').innerText()
    expect(/(\d{1,2}:\d{1,2}:\d{1,2}|Yesterday|\d{1,2}-\d{1,2}-\d{1,2})/.test(time)).toBe(true)
    // 上传速度: (上传中) 单位KB/s或MB/s
    const uploadSpeed = await window.locator('text=The WIRED CD - Rip. Sample. Mash. Share >> //following::*[4]').innerText()
    // console.log('uploadSpeed:' + uploadSpeed)
    expect(/(\d+(\.\d+)?\s?(KB|MB)?|-)/.test(uploadSpeed)).toBe(true)
    // 检查任务图标
    // stop 图标
    const stopIcon = await window.locator('text=The WIRED CD - Rip. Sample. Mash. Share >> //following::*[5]/Button[1]')
    const stopIconText = await stopIcon.innerText()
    expect(stopIconText).toBe('stop')
    // file_open 图标
    const fileOpenIcon = await window.locator('text=The WIRED CD - Rip. Sample. Mash. Share >> //following::*[5]/Button[2]').innerText()
    expect(fileOpenIcon).toBe('file_open')
    // folder 图标
    const fileIcon = await window.locator('text=The WIRED CD - Rip. Sample. Mash. Share >> //following::*[5]/Button[3]').innerText()
    expect(fileIcon).toBe('folder')
    // more... 图标
    const moreIcon = await window.locator('text=The WIRED CD - Rip. Sample. Mash. Share >> //following::*[5]/Button[4]')
    const moreIconText = await moreIcon.innerText()
    expect(moreIconText).toBe('more_horiz')
    // close 图标
    const closeIcon = await window.locator('text=The WIRED CD - Rip. Sample. Mash. Share >> //following::*[5]/Button[5]')
    const closeIconText = await closeIcon.innerText()
    expect(closeIconText).toBe('close')
    await closeIcon.click()
    await window.waitForSelector('.q-card >> text=Delete task', { timeout: 10000 })
    await window.locator('button[role="button"]:has-text("Not now")').click()
    // "更多"功能检查Download url
    await moreIcon.click()
    const downloadURI = await window.locator('[aria-label="Download URI"]').innerText()
    console.log('The WIRED CD downloadURI:' + downloadURI)
    await window.click('text=content_copy')

    // "更多"功能检查文件路径
    const filePathElement = await window.locator('text=Files: >> //following::*[4]')
    const filePathText = await filePathElement.innerText()
    const filePath = path.resolve(__dirname, '../download')
    // 字符串路径转为正则表达式
    let filePathReg = ''
    for (const char of filePath) {
      if (char === '\\') filePathReg += '\\' + char
      else filePathReg += char
    }
    const reg = new RegExp(filePathReg + '\\\\The WIRED CD')
    console.log('filePathText:' + filePathText)
    // expect(reg.test(filePathText)).toBe(true)
    // 检查文件夹树状结构
    await filePathElement.click()
    await window.waitForSelector('text=audio_file 01 - Beastie Boys - Now Get Busy.mp3')
    await window.waitForSelector('text=insert_drive_file README.md')
    await window.waitForSelector('text=image poster.jpg')
    await sleep(500)
    // 退出卡片
    await window.locator('text=PAUSE ALL').click({ force: true })
    // downloaded状态栏
    await stopIcon.click()
    await commands.jumpPage('downloadedStatus')
    const theWoredCD = await window.locator('text=The WIRED CD - Rip. Sample. Mash. Share')
    await theWoredCD.waitFor('visible')
    await sleep(500)
    // 检查任务图标
    const uploadIcon = await window.locator('text=The WIRED CD - Rip. Sample. Mash. Share >> //following::*[4]/Button[1]')
    const uploadIconText = await uploadIcon.innerText()
    expect(uploadIconText).toBe('cloud_upload')
    await sleep(500)
    await uploadIcon.click()
    await theWoredCD.waitFor('hidden')
    await sleep(500)
    await commands.jumpPage('uploadingStatus')
    await sleep(500)
    await theWoredCD.waitFor('visible')
    // // 验证magnet被复制到剪贴板
    await commands.jumpPage('downloadingStatus')
    await commands.downloadBtn.click()
    await sleep(1000)
    const magnetText = await window.locator('//*[@aria-label="Download directory position"]/preceding::*[1]').inputValue()
    console.log('magnetText:' + magnetText)
    expect(/alphabiz:\/\/The\+WIRED\+CD/.test(magnetText)).toBe(true)
    await window.click('button[role="button"]:has-text("Cancel")')
    await sleep(1000)
    await window.reload()
  })
})

test.describe('upload', () => {
  test.skip('test1', async () => {
    test.setTimeout(60000 * 15)
    const btName = 'ChinaCup.1080p.H264.AAC.mp4'
    const btAddress = path.resolve(__dirname, '../cypress/fixtures/samples/ChinaCup.1080p.H264.AAC.mp4')
    // const oneFile = new File([''], btAddress, { path: btAddress })
    // const btCard = 'text=' + btName + ' >> xpath=..//..//..//..//.. >> '

    await commands.jumpPage('homeLink')
    // Click button[role="button"]:has-text("Upload torrent")
    await window.click('button[role="button"]:has-text("Upload torrent")')

    console.log(path.resolve(__dirname, '../cypress/fixtures/samples/ChinaCup.1080p.H264.AAC.mp4'))
    // await window.dispatchEvent('input[type="file"]', 'input', path.resolve(__dirname, '../cypress/fixtures/samples/ChinaCup.1080p.H264.AAC.mp4'))
    // 1
    // const [fileChooser] = await Promise.all([
    //   window.waitForEvent('filechooser'),
    //   window.click('input[type="file"]')
    // ])
    // await fileChooser.setFiles(path.resolve(__dirname, '../cypress/fixtures/samples/ChinaCup.1080p.H264.AAC.mp4'))
    // 2
    fs.readFile(btAddress, async function read (err, data) {
      if (err) {
        throw err
      }
      console.log(data)
      await window.locator('input[type="file"]').setInputFiles({
        name: 'ChinaCup.1080p.H264.AAC.mp4',
        mimeType: 'video/mp4',
        buffer: data,
        path: btAddress,
        pathExt: 'btAddress'
      })
    })
    // 3
    // await window.locator('input[type="file"]').setInputFiles(btAddress)
    await window.waitForTimeout(1000)

    // const elementHandle = await window.$('input[type="file"]')
    // const props = await elementHandle.getProperties()
    // console.log('props:' + props)
    // console.log('1:' + props.has('files'))
    // await elementHandle.evaluate(node => node.setAttribute('files'))
    // await window.waitForTimeout(1000)

    await window.click(':nth-match(button[role="button"]:has-text("Upload"), 2)')
    await window.waitForTimeout(1000)
    await window.click('text=' + btName, { timeout: 5000 })
  })
})

test.describe('account', () => {
  const userInfo = [
    {
      nikename: 'test3',
      username: process.env.TEST3_EMAIL,
      password: process.env.TEST_PASSWORD,
      resetPassword: process.env.TEST_RESET_PASSWORD
    },
    {
      nikename: 'test2',
      username: process.env.TEST2_EMAIL,
      password: process.env.TEST_PASSWORD
    }
  ]
  for (const user of userInfo) {
    test.skip(user.nikename + ' sign up', async () => {
      test.setTimeout(60000 * 10)
      await window.waitForLoadState()
      const isHasAlert = await window.isVisible('div[role="alert"]:has-text("check_circleSigned out")')
      if (isHasAlert) {
        await window.reload()
      }
      const newTime2 = new Date()
      // await commands.jumpPage('accountLink')
      await commands.signIn(user.username, user.password, 0)

      const notification = await window.locator('.q-notification__message')
      await notification.waitFor({ timeout: 40000 })
      const alert = await notification.innerText()
      console.log(alert)
      if (/Incorrect username or password/.test(alert)) {
        // sign up part 1
        await window.click('button[role="button"]:has-text("Sign up")')
        await window.click('text=Sign up by email')
        await window.fill('[aria-label="Email"]', user.username)
        await window.fill('[aria-label="Password"]', user.password)
        await window.fill('[aria-label="Invitation code"]', '5EPD12NW3F')
        await window.click('text=I accept')
        await window.click('button[role="button"]:has-text("Next")')
        // sign up part 2
        await window.locator('[aria-label="Verification code"]').waitFor()
        const verificationCode = await getMailCode({ type: 1, time: newTime2 })
        await window.fill('[aria-label="Verification code"]', verificationCode)
        await window.click('button[role="button"]:has-text("Finish")')
        // wait alert
        await window.click('div[role="alert"]:has-text("check_circleSigned up")')
      } else if (/Signed in/.test(alert)) {
      // 账号已经注册成功
      }
      await commands.signOut()
    })
  }
  test.skip('new sign in', async () => {
    test.setTimeout(60000 * 2)
    await window.waitForLoadState()
    // await commands.jumpPage('accountLink')
    await commands.signIn('zyl@alpha.biz', process.env.TEST_PASSWORD, 1)
    await window.locator('header:has-text("Account Settings")').waitFor({ timeout: 15000 })
    await commands.jumpPage('creditsLink')
    const credit = await commands.getCredit()
    console.log('credit:' + credit)
    await window.waitForTimeout(6000)
    await commands.signOut()
  })
  test.skip('test3 to test2 transfer - check bill details', async () => {
    test.setTimeout(60000 * 3)
    // 转账人账号、密码
    const transferee = userInfo[0].username
    const transfereePassword = userInfo[0].password
    // 收款人账号、密码
    const payee = userInfo[1].username
    const payeePassword = userInfo[1].password
    const transferAmount = 1
    // 如果应用已经登陆则退出登录状态
    const isHasAlert = await window.isVisible('div[role="alert"]:has-text("check_circleSigned out")')
    if (isHasAlert) {
      await window.reload()
    }
    await window.waitForLoadState()
    // 登录收款人账号
    await commands.signIn(payee, payeePassword, 1)
    await commands.jumpPage('creditsLink')
    // 获取收款人id
    const payeeID = await commands.getID()
    // console.log('payeeID:' + payeeID)
    await window.waitForTimeout(2000)
    const payeePoint = await window.locator('.text-right > div').innerText()
    const payeeAfterPoint = Number(payeePoint) + transferAmount
    // 退出收款人账号
    await commands.signOut()
    await sleep(1000)
    // 登录付款人账号
    await commands.signIn(transferee, transfereePassword, 1)
    await commands.jumpPage('creditsLink')
    // 获取转账人id
    const transfereeID = await commands.getID()
    let transfereePoint = await window.locator('.text-right > div').innerText()
    if (Number(transfereePoint) <= 0) {
      await window.click('button:nth-child(3)')
      await window.locator('.q-table__grid-content > :nth-child(1) > .q-item >> text=BONUS').waitFor('visible')
    }
    await window.waitForTimeout(2000)
    transfereePoint = await window.locator('.text-right > div').innerText()
    const transfereeAfterPoint = Number(transfereePoint) - transferAmount
    // 转账
    await commands.transfer(payeeID, transferAmount.toString())
    // 查看账单明细
    await commands.checkBillDetail(payeeID, 'Transfer', '-' + transferAmount, 'finish')
    // 断言积分变化是否正确
    expect(await window.locator('.text-right > div').innerText()).toBe(transfereeAfterPoint.toString())
    // 退出付款人账号
    await commands.signOut()
    await sleep(1000)
    // 登录收款人账号
    await commands.signIn(payee, payeePassword, 1)
    await commands.jumpPage('creditsLink')
    await sleep(2000)
    // 查看账单
    await commands.checkBillDetail(transfereeID, 'Transfer', '+' + transferAmount, 'finish')
    // 断言积分变化是否正确
    expect(await window.locator('.text-right > div').innerText()).toBe(payeeAfterPoint.toString())
    await commands.signOut()
    await sleep(1000)
  })
  test.skip('test3 reset password', async () => {
    // 查询重置账号
    await commands.jumpPage('accountLink')
    const newTime2 = new Date()
    await sleep(1000)
    await window.click('text=Reset password')
    await sleep(1000)
    await window.click('text=Find your account')
    await window.fill('[aria-label="Phone number or email"]', userInfo[0].username)
    await window.click('button[role="button"]:has-text("Search")')
    // 验证信息
    const verificationCode = await getMailCode({ type: 1, time: newTime2 })
    await window.fill('[aria-label="Verification code"]', verificationCode)
    await window.fill('[aria-label="Password"]', userInfo[0].resetPassword)
    await window.fill('[aria-label="Re-enter password"]', userInfo[0].resetPassword)
    await window.click('button[role="button"]:has-text("Submit")')
    // 断言提示框成功弹出
    await window.locator('.q-notification__message >> text=Password has been reset').waitFor({ timeout: 15000 })
  })

  for (const user of userInfo) {
    test.skip(user.nikename + ' delete user', async () => {
      await window.waitForLoadState()
      const isHasAlert = await window.isVisible('div[role="alert"]')
      if (isHasAlert) {
        await window.reload()
      }
      await commands.signIn(user.username, user.password, 0)
      const notification = await window.locator('.q-notification__message')
      await notification.waitFor({ timeout: 40000 })
      const alert = await notification.innerText()
      if (/Incorrect username or password/.test(alert)) {
        // 使用resetPassword登录
        await window.reload()
        await commands.signIn(user.username, user.resetPassword, 0)
        const notification = await window.locator('.q-notification__message')
        await notification.waitFor({ timeout: 40000 })
        const alert = await notification.innerText()
        if (/Incorrect username or password/.test(alert)) {
          // 用户不存在
        } else if (/Signed in/.test(alert)) {
        // resetPassword登录成功，需要删除
          await commands.jumpPage('accountLink', 'accountSettings')
          // delete user
          await commands.deleteUser(user.resetPassword)
        }
      } else if (/Signed in/.test(alert)) {
        // password登录成功，需要删除
        await commands.jumpPage('accountLink', 'accountSettings')
        // delete user
        await commands.deleteUser(user.password)
      }
      // 断言返回登录界面
      // await window.click('text=Sign in')
      if (await commands.accountLink.isHidden()) {
        await commands.menuIcon.click()
      }
      const concerText = await commands.accountLink.innerText()

      // console.log('concerText:' + concerText)
      expect(concerText).toBe('account_circle\nWant to Join?\nSign up')
    })
  }
})