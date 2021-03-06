global.marp or=
  config: require './classes/mds_config'
  development: false

{BrowserWindow, app, dialog }     = require 'electron'
Path      = require 'path'
MdsWindow = require './classes/mds_window'
MdsPresenWindow = require './classes/mds_presen_window'
MdsPresenDevWindow = require './classes/mds_presen_dev_window'
MainMenu  = require './classes/mds_main_menu'
{exist}   = require './classes/mds_file'
electron  = require 'electron'
ipc       = electron.ipcMain
MickrWindow = require '../MickrWindow.js'
MickrClient = require '../modules/MickrClient'
Tray      = electron.Tray
globalShortcut = electron.globalShortcut
powerSaveBlocker = electron.powerSaveBlocker
fs        = require 'fs'

# app.commandLine.appendSwitch("--enable-experimental-web-platform-features");
# about presentation
setting =
     "id": "main"
     "url": "ws://apps.wisdomweb.net:64260/ws/mik"
     "site": "test"
     "token": "Pad:9948"
client = new MickrClient(setting);

slideInfo = ""
presenDevWin = null
win = null
mickrWin = null
presenWin = null

tray = null;
tray2 = null;

# Initialize config
global.marp.config.initialize()

# Parse arguments
opts =
  file: null

for arg in process.argv.slice(1)
  break_arg = false
  switch arg
    when '--development', '--dev'
      global.marp.development = true
    else
      if exist(resolved_file = Path.resolve(arg))
        opts.file = resolved_file
        break_arg = true

  break if break_arg

# Application events
app.on 'window-all-closed', ->
  if process.platform != 'darwin' or !!MdsWindow.appWillQuit
    # global.marp.config.save()
    app.quit()

app.on 'before-quit', ->
  MdsWindow.appWillQuit = true

app.on 'activate', (e, hasVisibleWindows) ->
  new MdsWindow if app.isReady() and not hasVisibleWindows

app.on 'open-file', (e, path) ->
  e.preventDefault()

  opts.fileOpened = true
  MdsWindow.loadFromFile path, null

app.on 'ready', ->
  # mickr のウインドウ
  mickrWin = new MickrWindow()
  mickrWin.activateMainWindows()
  #/* メニューバー上のアイコンが押された場合の処理 */
  tray = new Tray(Path.join __dirname, '../','lib', 'img', 'cloud_on.png')
  tray.on 'click', (e) =>
    mickrWin.switchShowMode(tray)

  tray2 = new Tray(Path.join __dirname, '../','lib', 'img', 'ic_pause_black_24dp_2x.png')
  tray2.on 'click', (e) =>
    mickrWin.switchPause()

  # アプリのウインドウ
  global.marp.mainMenu = new MainMenu
    development: global.marp.development

  unless opts.fileOpened
    if opts.file
      MdsWindow.loadFromFile opts.file, null
    else
      win = new MdsWindow
 # receive Text
ipc.on 'textSend', (e, text) =>
  console.log 'receive textSend'
  #console.log text

  @presenDevWin= new MdsPresenDevWindow {}, {}, text

  electronScreen = electron.screen
  displays = electronScreen.getAllDisplays()
  externalDisplay = null
  for i in displays
    if (i.bounds.x != 0 || i.bounds.y != 0)
      externalDisplay = i
      break
  #　外部ディスプレイが存在する場合
  if (externalDisplay)
    @presenWin = new MdsPresenWindow
      x: externalDisplay.bounds.x + 50,
      y: externalDisplay.bounds.y + 50
  # 外部ディスプレイが存在しない場合
  else
    @presenWin = new MdsPresenWindow
      width:800
      height: 600
  # text には、slide_wrapperのHTML要素がid順に入っている
  @slideInfo = text
  nonHTML = []

  # htmlタグ削除 & 文字列の形を整える
  for idx, value of text
    nonHTML[idx] = value.replace(/<(".*?"|'.*?'|[^'"])*?>/gi, " ")    # HTMLタグ消去
    nonHTML[idx] = nonHTML[idx].replace(/\n/gi, "")  # 改行文字の削除
    nonHTML[idx] = nonHTML[idx].replace(/\s+/gi, "") # 空白の削除
    nonHTML[idx] = nonHTML[idx].substr(0, nonHTML[idx].length-1)  # 末尾にページ数が入るので、末尾を削除

  # htmlタグを含まない本文
  console.log nonHTML
  # それぞれのスライドのテキストを結合し、リストに一つの要素として入れて
  # 、それをpythonに渡す
  nonHTML = nonHTML.join("")
  console.log nonHTML
  input = []
  input.push(nonHTML)

 ipc.on 'loadUsedSlide', () ->
    console.log 'receive loadUsedSlide'
    args = [
          {
            title: 'Open'
            filters: [
              { name: 'Markdown files', extensions: ['md', 'mdown'] }
              { name: 'Text file', extensions: ['txt'] }
              { name: 'All files', extensions: ['*'] }
            ]
            properties: ['openFile', 'createDirectory']
          }
          (fnames) ->
            return unless fnames?
            win.browserWindow.webContents.send 'sendUsedSlidePath', fnames[0]
        ]
    dialog.showOpenDialog.apply win, args


# ipc.on 'requestSlideInfo', () =>
#   console.log 'receive requestSlideInfo'
#   @presenDevWin.webContents.send 'sendSlideInfo', @slideInfo

ipc.on 'goToPage', (e, page) =>
  console.log page
  win.browserWindow.webContents.send 'goToPage', page

ipc.on 'PdfExport', () =>
  console.log 'PDF Export'
  win.trigger 'exportPdfDialog'
# ipc.on 'Presentation', () =>
#   presenDevWin = new MdsWindow
#   presenDevWin.webContents.send 'initialize'
#   presenDevWin.openDevTools()

