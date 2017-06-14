electron = require 'electron'
ipc      = electron.ipcRenderer


document.addEventListener 'DOMContentLoaded', ->
  $ = window.jQuery = window.$ = require('jquery')
  ipc.send 'requestSlideInfo', () =>
    console.log 'send requestSlideInfo'

  ipc.on 'sendSlideInfo', (ev, text) =>
    console.log 'receive sendSlideInfo'
    console.log text
    $('.markdown-body').html(text)
