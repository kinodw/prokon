global.marp or=
  config: require './classes/mds_config'
  development: false

{BrowserWindow, app}     = require 'electron'
Path      = require 'path'
MdsWindow = require './classes/mds_window'
MdsPresenWindow = require './classes/mds_presen_window'
MainMenu  = require './classes/mds_main_menu'
{exist}   = require './classes/mds_file'
electron  = require 'electron'
ipc       = electron.ipcMain


# app.commandLine.appendSwitch("--enable-experimental-web-platform-features");
# about presentation
slideInfo = ""
presenDevWin = null
win = null

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

  @presenDevWin= new MdsPresenWindow {}, {}, text
  # text には、slide_wrapperのHTML要素がid順に入っている
  @slideInfo = text
  nonHTML = []

  # htmlタグ削除 & 文字列の形を整える
  for idx, value of text
    nonHTML[idx] = value.replace(/<(".*?"|'.*?'|[^'"])*?>/gi, " ")    # HTMLタグ消去
    nonHTML[idx] = nonHTML[idx].replace(/\n/gi, "")  # 改行文字の削除
    nonHTML[idx] = nonHTML[idx].replace(/\s+/gi, "") # 空白の削除
    nonHTML[idx] = nonHTML[idx].substr(0, nonHTML[idx].length-1)  # 末尾にページ数が入るので、末尾を削除

    console.log "text[#{idx}] = #{value}"
  console.log nonHTML

  # ここでpythonにslideInfoを渡し処理を行う



# ipc.on 'requestSlideInfo', () =>
#   console.log 'receive requestSlideInfo'
#   @presenDevWin.webContents.send 'sendSlideInfo', @slideInfo

ipc.on 'goToPage', (e, page) =>
  console.log page
  win.browserWindow.webContents.send 'goToPage', page

# ipc.on 'Presentation', () =>
#   presenDevWin = new MdsWindow
#   presenDevWin.webContents.send 'initialize'
#   presenDevWin.openDevTools()

