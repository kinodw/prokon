var execSync, fs;

fs = require('fs');

execSync = require('child_process').execSync;

module.exports = {
  exist: function(fname) {
    try {
      if (fs.accessSync(fname, fs.R_OK) == null) {
        if (fs.lstatSync(fname).isFile()) {
          return true;
        }
      }
    } catch (error) {}
    return false;
  },
  readFile: function(filePath) {
    return fs.readFile(filePath, 'utf-8', function(err, data) {
      if (err) {
        throw err;
      }
      return console.log(data);
    });
  }
};

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfZmlsZS5qcyIsInNvdXJjZXMiOlsiY2xhc3Nlcy9tZHNfZmlsZS5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBQTs7QUFBQSxFQUFBLEdBQUssT0FBQSxDQUFRLElBQVI7O0FBQ0wsUUFBQSxHQUFXLE9BQUEsQ0FBUSxlQUFSLENBQXdCLENBQUM7O0FBRXBDLE1BQU0sQ0FBQyxPQUFQLEdBQ0U7RUFBQSxLQUFBLEVBQU8sU0FBQyxLQUFEO0FBQ0w7TUFDRSxJQUFPLHFDQUFQO1FBQ0UsSUFBZSxFQUFFLENBQUMsU0FBSCxDQUFhLEtBQWIsQ0FBbUIsQ0FBQyxNQUFwQixDQUFBLENBQWY7QUFBQSxpQkFBTyxLQUFQO1NBREY7T0FERjtLQUFBO1dBR0E7RUFKSyxDQUFQO0VBTUEsUUFBQSxFQUFVLFNBQUMsUUFBRDtXQUNSLEVBQUUsQ0FBQyxRQUFILENBQVksUUFBWixFQUFzQixPQUF0QixFQUErQixTQUFDLEdBQUQsRUFBTSxJQUFOO01BQzNCLElBQUcsR0FBSDtBQUNJLGNBQU0sSUFEVjs7YUFFQSxPQUFPLENBQUMsR0FBUixDQUFZLElBQVo7SUFIMkIsQ0FBL0I7RUFEUSxDQU5WIiwic291cmNlc0NvbnRlbnQiOlsiZnMgPSByZXF1aXJlICdmcydcbmV4ZWNTeW5jID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWNTeW5jO1xuXG5tb2R1bGUuZXhwb3J0cyA9XG4gIGV4aXN0OiAoZm5hbWUpIC0+XG4gICAgdHJ5XG4gICAgICB1bmxlc3MgZnMuYWNjZXNzU3luYyhmbmFtZSwgZnMuUl9PSyk/XG4gICAgICAgIHJldHVybiB0cnVlIGlmIGZzLmxzdGF0U3luYyhmbmFtZSkuaXNGaWxlKClcbiAgICBmYWxzZVxuXG4gIHJlYWRGaWxlOiAoZmlsZVBhdGgpIC0+XG4gICAgZnMucmVhZEZpbGUgZmlsZVBhdGgsICd1dGYtOCcsIChlcnIsIGRhdGEpIC0+XG4gICAgICAgIGlmKGVycilcbiAgICAgICAgICAgIHRocm93IGVyclxuICAgICAgICBjb25zb2xlLmxvZyBkYXRhIl19
