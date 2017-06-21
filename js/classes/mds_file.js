var fs;

fs = require('fs');

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
  }
};

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfZmlsZS5qcyIsInNvdXJjZXMiOlsiY2xhc3Nlcy9tZHNfZmlsZS5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBQTs7QUFBQSxFQUFBLEdBQUssT0FBQSxDQUFRLElBQVI7O0FBRUwsTUFBTSxDQUFDLE9BQVAsR0FDRTtFQUFBLEtBQUEsRUFBTyxTQUFDLEtBQUQ7QUFDTDtNQUNFLElBQU8scUNBQVA7UUFDRSxJQUFlLEVBQUUsQ0FBQyxTQUFILENBQWEsS0FBYixDQUFtQixDQUFDLE1BQXBCLENBQUEsQ0FBZjtBQUFBLGlCQUFPLEtBQVA7U0FERjtPQURGO0tBQUE7V0FHQTtFQUpLLENBQVAiLCJzb3VyY2VzQ29udGVudCI6WyJmcyA9IHJlcXVpcmUgJ2ZzJ1xuXG5tb2R1bGUuZXhwb3J0cyA9XG4gIGV4aXN0OiAoZm5hbWUpIC0+XG4gICAgdHJ5XG4gICAgICB1bmxlc3MgZnMuYWNjZXNzU3luYyhmbmFtZSwgZnMuUl9PSyk/XG4gICAgICAgIHJldHVybiB0cnVlIGlmIGZzLmxzdGF0U3luYyhmbmFtZSkuaXNGaWxlKClcbiAgICBmYWxzZVxuIl19
