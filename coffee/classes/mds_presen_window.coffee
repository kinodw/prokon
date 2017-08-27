MdsWindow = require './mds_window'
{BrowserWindow, dialog} = require 'electron'

MdsManager     = require './mds_manager'
MdsMenu        = require './mds_menu'
MdsMainMenu    = require './mds_main_menu'
MdsFileHistory = require './mds_file_history'
extend         = require 'extend'
fs             = require 'fs'
jschardet      = require 'jschardet'
iconv_lite     = require 'iconv-lite'
Path           = require 'path'
electron       = require 'electron'
ipc        = electron.ipcMain


module.exports = class PresenWindow extends MdsWindow
  constructor: (fileOpts = {}, @options = {}, slideHTML) ->
        @path = fileOpts?.path || null
        slide = slideHTML
        console.log "@options = " + JSON.stringify(@options, null, ' ')

        #@viewMode = global.marp.config.get('viewMode')

        @viewMode = 'screen'

        @browserWindow = do =>
          # 初期設定options と @options をマージして初期化、ウインドウID設定
          bw = new BrowserWindow extend(true, {}, MdsWindow.defOptions(), @options,
            "titleBarStyle": "hidden")
          @_window_id = bw.id

          loadCmp = (details) =>
            setTimeout =>
              @_watchingResources.delete(details.id)
              @updateResourceState()
            , 500
          # about webRequest
          # details object describes request
          # The filter object has a urls property which is an Array of URL patterns-
          # -that will be used to filter out the requests that do not match the URL patterns.
          # If the filter is omitted then all requests will be matched.
          bw.webContents.session.webRequest.onCompleted loadCmp
          bw.webContents.session.webRequest.onErrorOccurred loadCmp
          bw.webContents.session.webRequest.onBeforeRequest (details, callback) =>
            @_watchingResources.add(details.id)
            @updateResourceState()
            callback({})

          @menu = new MdsMainMenu
            window: bw
            development: global.marp.development
            viewMode: @viewMode

          bw.maximize() if global.marp.config.get 'windowPosition.maximized'

          bw.loadURL "file://#{__dirname}/../../presenIndex.html"

          bw.webContents.on 'did-finish-load', =>
            @_windowLoaded = true
            #@send 'setSplitter', global.marp.config.get('splitterPosition')
            @send 'setSplitter', 0.65
            @send 'setEditorConfig', global.marp.config.get('editor')
            @trigger 'load', fileOpts?.buffer || '', @path
            bw.webContents.send 'presenDevInitialize', slide

          bw.once 'ready-to-show', => bw.show()

          bw.on 'close', (e) =>
            if @freeze
              e.preventDefault()
              MdsWindow.appWillQuit = false
              return
          bw.on 'closed', =>
            @browserWindow = null
            @_setIsOpen false

          updateWindowPosition = (e) =>
            unless global.marp.config.set('windowPosition.maximized', bw.isMaximized())
              global.marp.config.merge { windowPosition: bw.getBounds() }

          bw.on 'move', updateWindowPosition
          bw.on 'resize', updateWindowPosition
          bw.on 'maximize', updateWindowPosition
          bw.on 'unmaximize', updateWindowPosition

          bw.mdsWindow = @
          bw

        @_setIsOpen true