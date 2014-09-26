// Copyright 2013 cocopon
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

function printProperties(obj) {
  var properties = '';
  for (var prop in obj){
    properties += prop + "=" + obj[prop] + "\n";
  }
  alert(properties);
}

var util = {
  typeOf: function(value) {
    if (util.isNull(value)) {
      return 'null';
    }

    var type = typeof(value);

    if (type === 'object' && value instanceof Array) {
      return 'array';
    }

    return type;
  },

  isDefined: function(value) {
    return value !== undefined;
  },

  isNull: function(value) {
    return value === null;
  }
};


util.array = {
  clone: function(array) {
    var clone = [];

    util.array.forEach(array, function(item) {
      clone.push(item);
    });

    return clone;
  },

  concat: function(array1, array2) {
    var result = util.array.clone(array1);

    util.array.forEach(array2, function(item) {
      result.push(item);
    });

    return result;
  },

  forEach: function(array, func, opt_scope) {
    var len = array.length;
    var scope = opt_scope || this;
    var i;

    for (i = 0; i < len; i++) {
      func.call(scope, array[i], i);
    }
  },

  insertArrayAt: function(array, itemsToAdd, opt_index) {
    var len = array.length;
    var index = (opt_index === undefined) ? 0 : opt_index;
    if (index < 0) {
      index = len - index;
    }

    var result = array.slice(0, index);
    util.array.forEach(itemsToAdd, function(item) {
      result.push(item);
    });

    var i;
    for (i = index; i < len; i++) {
      result.push(array[i]);
    }

    return result;
  },

  isEmpty: function(array) {
    return array.length === 0;
  }
};

util.path = {
  getFileName: function(path) {
    var index = path.lastIndexOf('/');
    return index < 0
      ? path
      : path.substring(index + 1);
  },

  getFolderName: function(path) {
    var index = path.lastIndexOf('/');
    return index < 0
      ? ''
      : path.substring(0, index);
  },

  join: function(comps) {
    return comps.join('/');
  }
};


var ai = {};


ai.document = {
  isPageItem: function(value) {
    // TODO: Is there a better way?
    return !util.isNull(value.typename.match(/Item$/));
  },

  forEachPageItem: function(document, func, opt_scope) {
    var scope = opt_scope || this;
    var targets = [document];
    var target;

    while (targets.length > 0) {
      target = targets.shift();

      if (ai.document.isPageItem(target)) {
        func.call(scope, target);
      }

      if (util.isDefined(target.layers)) {
        targets = util.array.concat(targets, target.layers);
      }
      if (util.isDefined(target.pageItems)) {
        targets = util.array.concat(targets, target.pageItems);
      }
    }
  },

  findSlices: function(items) {
    var slices = [];

    util.array.forEach(items, function(item) {
      if (item.sliced) {
        slices.push(item);
      }
    });

    return slices;
  },

  findLayer: function(name) {
    var result = '';

    util.array.forEach(app.activeDocument.layers, function(layer) {
      if (layer.name == name) {
        result = layer;
      }
    });
    return result;
  },

  selectPageItem: function(document, itemToSelect) {
    ai.document.forEachPageItem(document, function(item) {
      item.selected = (item === itemToSelect);
    });
  }
};


// TODO: Is there an official document about available error codes?
ai.error = {
  NO_SUCH_ELEMENT: 1302
};


var main = function() {
  var document;
  try {
    document = app.activeDocument;
  } catch (e) {
    if (e.number === ai.error.NO_SUCH_ELEMENT) {
      alert('No documents to export.');
    }
    else {
      alert('An unexpected error has occurred.');
    }
    return;
  }

  var slices = ai.document.findSlices(document.pageItems);
  if (util.array.isEmpty(slices.length)) {
    ('No slices to export.');
    return;
  }

  var baseDir = Folder.selectDialog('Select an output directory');
  if (util.isNull(baseDir)) {
    return;
  }

  util.array.forEach(slices, function(slice) {
    var relPath    = slice.name;
    var folderName = util.path.getFolderName(relPath);
    var folder     = new Folder(util.path.join([baseDir, folderName]));
    if (!folder.exists) {
      folder.create();
    }

    var fileName = util.path.getFileName(relPath);
    var file = new File(util.path.join([folder.absoluteURI, fileName]));

    // select a pageItem from the slice
    layer = ai.document.findLayer(slice.name);
    util.array.forEach(layer.pageItems, function(pageItem) {
      pageItem.selected = true;
    });
    app.copy();

    var tempDoc = documents.add(DocumentColorSpace.RGB, slice.width, slice.height);

    app.paste();

    // save SVG
    var opts = new ExportOptionsSVG();
    opts.artBoardClipping = true;
    app.activeDocument.exportFile(file, ExportType.SVG, opts);

    // deselect the pageItem
    util.array.forEach(layer.pageItems, function(pageItem) {
      pageItem.selected = false;
    });

    app.activeDocument.close();
  });
};

if (app && app.name === 'Adobe Illustrator') {
  main();
}
