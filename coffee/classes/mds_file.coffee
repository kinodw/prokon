fs = require 'fs'
execSync = require('child_process').execSync;

module.exports =
  exist: (fname) ->
    try
      unless fs.accessSync(fname, fs.R_OK)?
        return true if fs.lstatSync(fname).isFile()
    false

  readFile: (filePath) ->
    fs.readFile filePath, 'utf-8', (err, data) ->
        if(err)
            throw err
        console.log data