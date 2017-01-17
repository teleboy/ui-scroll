/*!
 * angular-ui-scroll
 * https://github.com/angular-ui/ui-scroll.git
 * Version: 1.5.2 -- 2017-01-17T11:43:56.479Z
 * License: MIT
 */
 

 (function () {
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=='function'&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error('Cannot find module \''+o+'\'');throw f.code='MODULE_NOT_FOUND',f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=='function'&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = Adapter;

function Adapter($rootScope, $parse, $attr, viewport, buffer, adjustBuffer, element) {
  var viewportScope = viewport.scope() || $rootScope;
  var disabled = false;
  var self = this;

  createValueInjector('adapter')(self);
  var topVisibleInjector = createValueInjector('topVisible');
  var topVisibleElementInjector = createValueInjector('topVisibleElement');
  var topVisibleScopeInjector = createValueInjector('topVisibleScope');
  var isLoadingInjector = createValueInjector('isLoading');

  // Adapter API definition

  Object.defineProperty(this, 'disabled', {
    get: function get() {
      return disabled;
    },
    set: function set(value) {
      return !(disabled = value) ? adjustBuffer() : null;
    }
  });

  this.isLoading = false;
  this.isBOF = function () {
    return buffer.bof;
  };
  this.isEOF = function () {
    return buffer.eof;
  };

  this.applyUpdates = function (arg1, arg2) {
    if (angular.isFunction(arg1)) {
      // arg1 is the updater function, arg2 is ignored
      buffer.slice(0).forEach(function (wrapper) {
        // we need to do it on the buffer clone, because buffer content
        // may change as we iterate through
        applyUpdate(wrapper, arg1(wrapper.item, wrapper.scope, wrapper.element));
      });
    } else {
      // arg1 is item index, arg2 is the newItems array
      if (arg1 % 1 !== 0) {
        // checking if it is an integer
        throw new Error('applyUpdates - ' + arg1 + ' is not a valid index');
      }

      var index = arg1 - buffer.first;
      if (index >= 0 && index < buffer.length) {
        applyUpdate(buffer[index], arg2);
      }
    }

    adjustBuffer();
  };

  this.append = function (newItems) {
    buffer.append(newItems);
    adjustBuffer();
  };

  this.prepend = function (newItems) {
    buffer.prepend(newItems);
    adjustBuffer();
  };

  this.loading = function (value) {
    isLoadingInjector(value);
  };

  this.calculateProperties = function () {
    var item = undefined,
        itemHeight = undefined,
        itemTop = undefined,
        isNewRow = undefined,
        rowTop = null;
    var topHeight = 0;
    for (var i = 0; i < buffer.length; i++) {
      item = buffer[i];
      itemTop = item.element.offset().top;
      isNewRow = rowTop !== itemTop;
      rowTop = itemTop;
      if (isNewRow) {
        itemHeight = item.element.outerHeight(true);
      }
      if (isNewRow && viewport.topDataPos() + topHeight + itemHeight <= viewport.topVisiblePos()) {
        topHeight += itemHeight;
      } else {
        if (isNewRow) {
          topVisibleInjector(item.item);
          topVisibleElementInjector(item.element);
          topVisibleScopeInjector(item.scope);
        }
        break;
      }
    }
  };

  // private function definitions

  function createValueInjector(attribute) {
    var expression = $attr[attribute];
    var scope = viewportScope;
    var assign = undefined;
    if (expression) {
      // it is ok to have relaxed validation for the first part of the 'on' expression.
      // additional validation will be done by the $parse service below
      var match = expression.match(/^(\S+)(?:\s+on\s+(\w(?:\w|\d)*))?/);
      if (!match) throw new Error('Expected injection expression in form of \'target\' or \'target on controller\' but got \'' + expression + '\'');
      var target = match[1];
      var onControllerName = match[2];

      var parseController = function parseController(controllerName, on) {
        var candidate = element;
        while (candidate.length) {
          var candidateScope = candidate.scope();
          // ng-controller's 'Controller As' parsing
          var candidateName = (candidate.attr('ng-controller') || '').match(/(\w(?:\w|\d)*)(?:\s+as\s+(\w(?:\w|\d)*))?/);
          if (candidateName && candidateName[on ? 1 : 2] === controllerName) {
            scope = candidateScope;
            return true;
          }
          // directive's/component's 'Controller As' parsing
          if (!on && candidateScope && candidateScope.hasOwnProperty(controllerName) && Object.getPrototypeOf(candidateScope[controllerName]).constructor.hasOwnProperty('$inject')) {
            scope = candidateScope;
            return true;
          }
          candidate = candidate.parent();
        }
      };

      if (onControllerName) {
        // 'on' syntax DOM parsing (adapter='adapter on ctrl')
        scope = null;
        parseController(onControllerName, true);
        if (!scope) {
          throw new Error('Failed to locate target controller \'' + onControllerName + '\' to inject \'' + target + '\'');
        }
      } else {
        // try to parse DOM with 'Controller As' syntax (adapter='ctrl.adapter')
        var controllerAsName = undefined;
        var dotIndex = target.indexOf('.');
        if (dotIndex > 0) {
          controllerAsName = target.substr(0, dotIndex);
          parseController(controllerAsName, false);
        }
      }

      assign = $parse(target).assign;
    }
    return function (value) {
      if (self !== value) // just to avoid injecting adapter reference in the adapter itself. Kludgy, I know.
        self[attribute] = value;
      if (assign) assign(scope, value);
    };
  }

  function applyUpdate(wrapper, newItems) {
    if (!angular.isArray(newItems)) {
      return;
    }

    var keepIt = undefined;
    var pos = buffer.indexOf(wrapper) + 1;

    newItems.reverse().forEach(function (newItem) {
      if (newItem === wrapper.item) {
        keepIt = true;
        pos--;
      } else {
        buffer.insert(pos, newItem);
      }
    });

    if (!keepIt) {
      wrapper.op = 'remove';
    }
  }
}

module.exports = exports['default'];

},{}],2:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = ScrollBuffer;

function ScrollBuffer(elementRoutines, bufferSize) {
  var buffer = Object.create(Array.prototype);

  angular.extend(buffer, {
    size: bufferSize,

    reset: function reset(startIndex) {
      buffer.remove(0, buffer.length);
      buffer.eof = false;
      buffer.bof = false;
      buffer.first = startIndex;
      buffer.next = startIndex;
      buffer.minIndex = startIndex;
      buffer.maxIndex = startIndex;
      buffer.minIndexUser = null;
      buffer.maxIndexUser = null;
    },

    append: function append(items) {
      items.forEach(function (item) {
        ++buffer.next;
        buffer.insert('append', item);
      });
      buffer.maxIndex = buffer.eof ? buffer.next - 1 : Math.max(buffer.next - 1, buffer.maxIndex);
    },

    prepend: function prepend(items) {
      items.reverse().forEach(function (item) {
        --buffer.first;
        buffer.insert('prepend', item);
      });
      buffer.minIndex = buffer.bof ? buffer.minIndex = buffer.first : Math.min(buffer.first, buffer.minIndex);
    },

    /**
     * inserts wrapped element in the buffer
     * the first argument is either operation keyword (see below) or a number for operation 'insert'
     * for insert the number is the index for the buffer element the new one have to be inserted after
     * operations: 'append', 'prepend', 'insert', 'remove', 'update', 'none'
     */
    insert: function insert(operation, item) {
      var wrapper = {
        item: item
      };

      if (operation % 1 === 0) {
        // it is an insert
        wrapper.op = 'insert';
        buffer.splice(operation, 0, wrapper);
      } else {
        wrapper.op = operation;
        switch (operation) {
          case 'append':
            buffer.push(wrapper);
            break;
          case 'prepend':
            buffer.unshift(wrapper);
            break;
        }
      }
    },

    // removes elements from buffer
    remove: function remove(arg1, arg2) {
      if (angular.isNumber(arg1)) {
        // removes items from arg1 (including) through arg2 (excluding)
        for (var i = arg1; i < arg2; i++) {
          elementRoutines.removeElement(buffer[i]);
        }

        return buffer.splice(arg1, arg2 - arg1);
      }
      // removes single item(wrapper) from the buffer
      buffer.splice(buffer.indexOf(arg1), 1);

      return elementRoutines.removeElementAnimated(arg1);
    },

    effectiveHeight: function effectiveHeight(elements) {
      if (!elements.length) {
        return 0;
      }
      var top = Number.MAX_VALUE;
      var bottom = Number.MIN_VALUE;
      elements.forEach(function (wrapper) {
        if (wrapper.element[0].offsetParent) {
          // element style is not display:none
          top = Math.min(top, wrapper.element.offset().top);
          bottom = Math.max(bottom, wrapper.element.offset().top + wrapper.element.outerHeight(true));
        }
      });
      return Math.max(0, bottom - top);
    }

  });

  return buffer;
}

module.exports = exports['default'];

},{}],3:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var ElementRoutines = (function () {
  function ElementRoutines($injector) {
    _classCallCheck(this, ElementRoutines);

    this.$animate = $injector.has && $injector.has('$animate') ? $injector.get('$animate') : null;
    this.isAngularVersionLessThen1_3 = angular.version.major === 1 && angular.version.minor < 3;
  }

  ElementRoutines.prototype.insertElement = function insertElement(newElement, previousElement) {
    previousElement.after(newElement);
    return [];
  };

  ElementRoutines.prototype.removeElement = function removeElement(wrapper) {
    wrapper.element.remove();
    wrapper.scope.$destroy();
    return [];
  };

  ElementRoutines.prototype.insertElementAnimated = function insertElementAnimated(newElement, previousElement) {
    var _this = this;

    if (!this.$animate) {
      return insertElement(newElement, previousElement);
    }

    if (this.isAngularVersionLessThen1_3) {
      var _ret = (function () {
        var deferred = $q.defer();
        // no need for parent - previous element is never null
        _this.$animate.enter(newElement, null, previousElement, function () {
          return deferred.resolve();
        });

        return {
          v: [deferred.promise]
        };
      })();

      if (typeof _ret === 'object') return _ret.v;
    }

    // no need for parent - previous element is never null
    return [this.$animate.enter(newElement, null, previousElement)];
  };

  ElementRoutines.prototype.removeElementAnimated = function removeElementAnimated(wrapper) {
    var _this2 = this;

    if (!this.$animate) {
      return removeElement(wrapper);
    }

    if (this.isAngularVersionLessThen1_3) {
      var _ret2 = (function () {
        var deferred = $q.defer();
        _this2.$animate.leave(wrapper.element, function () {
          wrapper.scope.$destroy();
          return deferred.resolve();
        });

        return {
          v: [deferred.promise]
        };
      })();

      if (typeof _ret2 === 'object') return _ret2.v;
    }

    return [this.$animate.leave(wrapper.element).then(function () {
      return wrapper.scope.$destroy();
    })];
  };

  return ElementRoutines;
})();

exports['default'] = ElementRoutines;
module.exports = exports['default'];

},{}],4:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = Padding;
function Cache() {
  var cache = Object.create(Array.prototype);

  angular.extend(cache, {
    add: function add(item) {
      for (var i = cache.length - 1; i >= 0; i--) {
        if (cache[i].index === item.scope.$index) {
          cache[i].height = item.element.outerHeight();
          return;
        }
      }
      cache.push({
        index: item.scope.$index,
        height: item.element.outerHeight()
      });
    },
    clear: function clear() {
      cache.length = 0;
    }
  });

  return cache;
}

function Padding(template) {
  var result = undefined;

  switch (template.tagName) {
    case 'dl':
      throw new Error('ui-scroll directive does not support <' + template.tagName + '> as a repeating tag: ' + template.outerHTML);
    case 'tr':
      var table = angular.element('<table><tr><td><div></div></td></tr></table>');
      result = table.find('tr');
      break;
    case 'li':
      result = angular.element('<li></li>');
      break;
    default:
      result = angular.element('<div></div>');
  }

  result.cache = new Cache();

  return result;
}

module.exports = exports['default'];

},{}],5:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = Viewport;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _padding = require('./padding');

var _padding2 = _interopRequireDefault(_padding);

function Viewport(elementRoutines, buffer, element, viewportController, padding) {
  var topPadding = null;
  var bottomPadding = null;
  var viewport = viewportController && viewportController.viewport ? viewportController.viewport : angular.element(window);
  var container = viewportController && viewportController.container ? viewportController.container : undefined;

  viewport.css({
    'overflow-y': 'auto',
    'display': 'block'
  });

  function bufferPadding() {
    return viewport.outerHeight() * padding; // some extra space to initiate preload
  }

  angular.extend(viewport, {
    createPaddingElements: function createPaddingElements(template) {
      topPadding = new _padding2['default'](template);
      bottomPadding = new _padding2['default'](template);
      element.before(topPadding);
      element.after(bottomPadding);
    },

    applyContainerStyle: function applyContainerStyle() {
      if (container && container !== viewport) {
        viewport.css('height', window.getComputedStyle(container[0]).height);
      }
    },

    bottomDataPos: function bottomDataPos() {
      var scrollHeight = viewport[0].scrollHeight;
      scrollHeight = scrollHeight != null ? scrollHeight : viewport[0].document.documentElement.scrollHeight;
      return scrollHeight - bottomPadding.height();
    },

    topDataPos: function topDataPos() {
      return topPadding.height();
    },

    bottomVisiblePos: function bottomVisiblePos() {
      return viewport.scrollTop() + viewport.outerHeight();
    },

    topVisiblePos: function topVisiblePos() {
      return viewport.scrollTop();
    },

    insertElement: function insertElement(e, sibling) {
      return elementRoutines.insertElement(e, sibling || topPadding);
    },

    insertElementAnimated: function insertElementAnimated(e, sibling) {
      return elementRoutines.insertElementAnimated(e, sibling || topPadding);
    },

    shouldLoadBottom: function shouldLoadBottom() {
      return !buffer.eof && viewport.bottomDataPos() < viewport.bottomVisiblePos() + bufferPadding();
    },

    clipBottom: function clipBottom() {
      // clip the invisible items off the bottom
      var overage = 0;
      var overageHeight = 0;
      var itemHeight = 0;
      var emptySpaceHeight = viewport.bottomDataPos() - viewport.bottomVisiblePos() - bufferPadding();

      for (var i = buffer.length - 1; i >= 0; i--) {
        itemHeight = buffer[i].element.outerHeight(true);
        if (overageHeight + itemHeight > emptySpaceHeight) {
          break;
        }
        bottomPadding.cache.add(buffer[i]);
        overageHeight += itemHeight;
        overage++;
      }

      if (overage > 0) {
        buffer.eof = false;
        buffer.remove(buffer.length - overage, buffer.length);
        buffer.next -= overage;
        viewport.adjustPadding();
      }
    },

    shouldLoadTop: function shouldLoadTop() {
      return !buffer.bof && viewport.topDataPos() > viewport.topVisiblePos() - bufferPadding();
    },

    clipTop: function clipTop() {
      // clip the invisible items off the top
      var overage = 0;
      var overageHeight = 0;
      var itemHeight = 0;
      var emptySpaceHeight = viewport.topVisiblePos() - viewport.topDataPos() - bufferPadding();

      for (var i = 0; i < buffer.length; i++) {
        itemHeight = buffer[i].element.outerHeight(true);
        if (overageHeight + itemHeight > emptySpaceHeight) {
          break;
        }
        topPadding.cache.add(buffer[i]);
        overageHeight += itemHeight;
        overage++;
      }

      if (overage > 0) {
        // we need to adjust top padding element before items are removed from top
        // to avoid strange behaviour of scroll bar during remove top items when we are at the very bottom
        topPadding.height(topPadding.height() + overageHeight);
        buffer.bof = false;
        buffer.remove(0, overage);
        buffer.first += overage;
      }
    },

    adjustPadding: function adjustPadding() {
      if (!buffer.length) {
        return;
      }

      // precise heights calculation, items that were in buffer once
      var topPaddingHeight = topPadding.cache.reduce(function (summ, item) {
        return summ + (item.index < buffer.first ? item.height : 0);
      }, 0);
      var bottomPaddingHeight = bottomPadding.cache.reduce(function (summ, item) {
        return summ + (item.index >= buffer.next ? item.height : 0);
      }, 0);

      // average item height based on buffer data
      var visibleItemsHeight = buffer.reduce(function (summ, item) {
        return summ + item.element.outerHeight(true);
      }, 0);
      var averageItemHeight = (visibleItemsHeight + topPaddingHeight + bottomPaddingHeight) / (buffer.maxIndex - buffer.minIndex + 1);

      // average heights calculation, items that have never been reached
      var adjustTopPadding = buffer.minIndexUser !== null && buffer.minIndex > buffer.minIndexUser;
      var adjustBottomPadding = buffer.maxIndexUser !== null && buffer.maxIndex < buffer.maxIndexUser;
      var topPaddingHeightAdd = adjustTopPadding ? (buffer.minIndex - buffer.minIndexUser) * averageItemHeight : 0;
      var bottomPaddingHeightAdd = adjustBottomPadding ? (buffer.maxIndexUser - buffer.maxIndex) * averageItemHeight : 0;

      // paddings combine adjustment
      topPadding.height(topPaddingHeight + topPaddingHeightAdd);
      bottomPadding.height(bottomPaddingHeight + bottomPaddingHeightAdd);
    },

    adjustScrollTopAfterMinIndexSet: function adjustScrollTopAfterMinIndexSet(topPaddingHeightOld) {
      // additional scrollTop adjustment in case of datasource.minIndex external set
      if (buffer.minIndexUser !== null && buffer.minIndex > buffer.minIndexUser) {
        var diff = topPadding.height() - topPaddingHeightOld;
        viewport.scrollTop(viewport.scrollTop() + diff);
      }
    },

    adjustScrollTopAfterPrepend: function adjustScrollTopAfterPrepend(updates) {
      if (!updates.prepended.length) return;
      var height = buffer.effectiveHeight(updates.prepended);
      var paddingHeight = topPadding.height() - height;
      if (paddingHeight >= 0) {
        topPadding.height(paddingHeight);
      } else {
        topPadding.height(0);
        viewport.scrollTop(viewport.scrollTop() - paddingHeight);
      }
    },

    resetTopPadding: function resetTopPadding() {
      topPadding.height(0);
      topPadding.cache.clear();
    },

    resetBottomPadding: function resetBottomPadding() {
      bottomPadding.height(0);
      bottomPadding.cache.clear();
    }
  });

  return viewport;
}

module.exports = exports['default'];

},{'./padding':4}],6:[function(require,module,exports){
/*!
 globals: angular, window
 List of used element methods available in JQuery but not in JQuery Lite
 element.before(elem)
 element.height()
 element.outerHeight(true)
 element.height(value) = only for Top/Bottom padding elements
 element.scrollTop()
 element.scrollTop(value)
 */

'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _modulesElementRoutinesJs = require('./modules/elementRoutines.js');

var _modulesElementRoutinesJs2 = _interopRequireDefault(_modulesElementRoutinesJs);

var _modulesBufferJs = require('./modules/buffer.js');

var _modulesBufferJs2 = _interopRequireDefault(_modulesBufferJs);

var _modulesViewportJs = require('./modules/viewport.js');

var _modulesViewportJs2 = _interopRequireDefault(_modulesViewportJs);

var _modulesAdapterJs = require('./modules/adapter.js');

var _modulesAdapterJs2 = _interopRequireDefault(_modulesAdapterJs);

angular.module('ui.scroll', []).directive('uiScrollViewport', function () {
  return {
    restrict: 'A',
    controller: ['$scope', '$element', function (scope, element) {
      var _this = this;

      this.container = element;
      this.viewport = element;

      angular.forEach(element.children(), function (child) {
        if (child.tagName.toLowerCase() === 'tbody') {
          _this.viewport = angular.element(child);
        }
      });

      return this;
    }]
  };
}).directive('uiScroll', ['$log', '$injector', '$rootScope', '$timeout', '$q', '$parse', function (console, $injector, $rootScope, $timeout, $q, $parse) {

  return {
    require: ['?^uiScrollViewport'],
    restrict: 'A',
    transclude: 'element',
    priority: 1000,
    terminal: true,
    link: link
  };

  function link($scope, element, $attr, controllers, linker) {
    var match = $attr.uiScroll.match(/^\s*(\w+)\s+in\s+([(\w|\$)\.]+)\s*$/);
    if (!match) {
      throw new Error('Expected uiScroll in form of \'_item_ in _datasource_\' but got \'' + $attr.uiScroll + '\'');
    }

    function parseNumericAttr(value, defaultValue) {
      var result = $parse(value)($scope);
      return isNaN(result) ? defaultValue : result;
    }

    var BUFFER_MIN = 3;
    var BUFFER_DEFAULT = 10;
    var PADDING_MIN = 0.3;
    var PADDING_DEFAULT = 0.5;

    var datasource = null;
    var itemName = match[1];
    var datasourceName = match[2];
    var viewportController = controllers[0];
    var bufferSize = Math.max(BUFFER_MIN, parseNumericAttr($attr.bufferSize, BUFFER_DEFAULT));
    var padding = Math.max(PADDING_MIN, parseNumericAttr($attr.padding, PADDING_DEFAULT));
    var startIndex = parseNumericAttr($attr.startIndex, 1);
    var ridActual = 0; // current data revision id
    var pending = [];

    var elementRoutines = new _modulesElementRoutinesJs2['default']($injector);
    var buffer = new _modulesBufferJs2['default'](elementRoutines, bufferSize);
    var viewport = new _modulesViewportJs2['default'](elementRoutines, buffer, element, viewportController, padding);
    var adapter = new _modulesAdapterJs2['default']($rootScope, $parse, $attr, viewport, buffer, adjustBuffer, element);

    if (viewportController) {
      viewportController.adapter = adapter;
    }

    var isDatasourceValid = function isDatasourceValid() {
      return angular.isObject(datasource) && angular.isFunction(datasource.get);
    };
    datasource = $parse(datasourceName)($scope); // try to get datasource on scope
    if (!isDatasourceValid()) {
      datasource = $injector.get(datasourceName); // try to inject datasource as service
      if (!isDatasourceValid()) {
        throw new Error(datasourceName + ' is not a valid datasource');
      }
    }

    var indexStore = {};

    function defineProperty(datasource, propName, propUserName) {
      var descriptor = Object.getOwnPropertyDescriptor(datasource, propName);
      if (!descriptor || !descriptor.set && !descriptor.get) {
        Object.defineProperty(datasource, propName, {
          set: function set(value) {
            indexStore[propName] = value;
            $timeout(function () {
              buffer[propUserName] = value;
              if (!pending.length) {
                var topPaddingHeightOld = viewport.topDataPos();
                viewport.adjustPadding();
                if (propName === 'minIndex') {
                  viewport.adjustScrollTopAfterMinIndexSet(topPaddingHeightOld);
                }
              }
            });
          },
          get: function get() {
            return indexStore[propName];
          }
        });
      }
    }

    defineProperty(datasource, 'minIndex', 'minIndexUser');
    defineProperty(datasource, 'maxIndex', 'maxIndexUser');

    var fetchNext = datasource.get.length !== 2 ? function (success) {
      return datasource.get(buffer.next, bufferSize, success);
    } : function (success) {
      datasource.get({
        index: buffer.next,
        append: buffer.length ? buffer[buffer.length - 1].item : void 0,
        count: bufferSize
      }, success);
    };

    var fetchPrevious = datasource.get.length !== 2 ? function (success) {
      return datasource.get(buffer.first - bufferSize, bufferSize, success);
    } : function (success) {
      datasource.get({
        index: buffer.first - bufferSize,
        prepend: buffer.length ? buffer[0].item : void 0,
        count: bufferSize
      }, success);
    };

    adapter.reload = reload;

    /**
     * Build padding elements
     *
     * Calling linker is the only way I found to get access to the tag name of the template
     * to prevent the directive scope from pollution a new scope is created and destroyed
     * right after the builder creation is completed
     */
    linker(function (clone, scope) {
      viewport.createPaddingElements(clone[0]);
      // we do not include the clone in the DOM. It means that the nested directives will not
      // be able to reach the parent directives, but in this case it is intentional because we
      // created the clone to access the template tag name
      scope.$destroy();
      clone.remove();
    });

    $scope.$on('$destroy', function () {
      unbindEvents();
      viewport.unbind('mousewheel', wheelHandler);
    });

    viewport.bind('mousewheel', wheelHandler);

    $timeout(function () {
      viewport.applyContainerStyle();
      reload();
    });

    /* Private function definitions */

    function isInvalid(rid) {
      return rid && rid !== ridActual || $scope.$$destroyed;
    }

    function bindEvents() {
      viewport.bind('resize', resizeAndScrollHandler);
      viewport.bind('scroll', resizeAndScrollHandler);
    }

    function unbindEvents() {
      viewport.unbind('resize', resizeAndScrollHandler);
      viewport.unbind('scroll', resizeAndScrollHandler);
    }

    function reload() {
      viewport.resetTopPadding();
      viewport.resetBottomPadding();
      if (arguments.length) {
        startIndex = arguments[0];
      }
      buffer.reset(startIndex);
      adjustBuffer();
    }

    function isElementVisible(wrapper) {
      return wrapper.element.height() && wrapper.element[0].offsetParent;
    }

    function visibilityWatcher(wrapper) {
      if (isElementVisible(wrapper)) {
        buffer.forEach(function (item) {
          if (angular.isFunction(item.unregisterVisibilityWatcher)) {
            item.unregisterVisibilityWatcher();
            delete item.unregisterVisibilityWatcher;
          }
        });
        adjustBuffer();
      }
    }

    function insertWrapperContent(wrapper, insertAfter) {
      createElement(wrapper, insertAfter, viewport.insertElement);
      if (!isElementVisible(wrapper)) {
        wrapper.unregisterVisibilityWatcher = wrapper.scope.$watch(function () {
          return visibilityWatcher(wrapper);
        });
      }
      wrapper.element.addClass('ng-hide'); // hide inserted elements before data binding
    }

    function createElement(wrapper, insertAfter, insertElement) {
      var promises = null;
      var sibling = insertAfter > 0 ? buffer[insertAfter - 1].element : undefined;
      linker(function (clone, scope) {
        promises = insertElement(clone, sibling);
        wrapper.element = clone;
        wrapper.scope = scope;
        scope[itemName] = wrapper.item;
      });
      if (adapter.transform) adapter.transform(wrapper.scope, wrapper.element);
      return promises;
    }

    function updateDOM() {
      var promises = [];
      var toBePrepended = [];
      var toBeRemoved = [];
      var inserted = [];

      buffer.forEach(function (wrapper, i) {
        switch (wrapper.op) {
          case 'prepend':
            toBePrepended.unshift(wrapper);
            break;
          case 'append':
            insertWrapperContent(wrapper, i);
            wrapper.op = 'none';
            inserted.push(wrapper);
            break;
          case 'insert':
            promises = promises.concat(createElement(wrapper, i, viewport.insertElementAnimated));
            wrapper.op = 'none';
            inserted.push(wrapper);
            break;
          case 'remove':
            toBeRemoved.push(wrapper);
        }
      });

      toBeRemoved.forEach(function (wrapper) {
        return promises = promises.concat(buffer.remove(wrapper));
      });

      if (toBePrepended.length) toBePrepended.forEach(function (wrapper) {
        insertWrapperContent(wrapper);
        wrapper.op = 'none';
      });

      buffer.forEach(function (item, i) {
        return item.scope.$index = buffer.first + i;
      });

      return {
        prepended: toBePrepended,
        removed: toBeRemoved,
        inserted: inserted,
        animated: promises
      };
    }

    function updatePaddings(rid, updates) {
      // schedule another adjustBuffer after animation completion
      if (updates.animated.length) {
        $q.all(updates.animated).then(function () {
          viewport.adjustPadding();
          adjustBuffer(rid);
        });
      } else {
        viewport.adjustPadding();
      }
    }

    function enqueueFetch(rid, updates) {
      if (viewport.shouldLoadBottom()) {
        if (!updates || buffer.effectiveHeight(updates.inserted) > 0) {
          // this means that at least one item appended in the last batch has height > 0
          if (pending.push(true) === 1) {
            fetch(rid);
            adapter.loading(true);
          }
        }
      } else if (viewport.shouldLoadTop()) {
        if (!updates || buffer.effectiveHeight(updates.prepended) > 0 || pending[0]) {
          // this means that at least one item appended in the last batch has height > 0
          // pending[0] = true means that previous fetch was appending. We need to force at least one prepend
          // BTW there will always be at least 1 element in the pending array because bottom is fetched first
          if (pending.push(false) === 1) {
            fetch(rid);
            adapter.loading(true);
          }
        }
      }
    }

    function adjustBuffer(rid) {
      if (!rid) {
        // dismiss pending requests
        pending = [];
        rid = ++ridActual;
      }

      var updates = updateDOM();

      // We need the item bindings to be processed before we can do adjustment
      $timeout(function () {

        // show elements after data binging has been done
        updates.inserted.forEach(function (w) {
          return w.element.removeClass('ng-hide');
        });
        updates.prepended.forEach(function (w) {
          return w.element.removeClass('ng-hide');
        });

        if (isInvalid(rid)) {
          return;
        }

        updatePaddings(rid, updates);
        enqueueFetch(rid);

        if (!pending.length) {
          adapter.calculateProperties();
        }
      });
    }

    function adjustBufferAfterFetch(rid) {
      var updates = updateDOM();

      // We need the item bindings to be processed before we can do adjustment
      $timeout(function () {

        // show elements after data binging has been done
        updates.inserted.forEach(function (w) {
          return w.element.removeClass('ng-hide');
        });
        updates.prepended.forEach(function (w) {
          return w.element.removeClass('ng-hide');
        });

        viewport.adjustScrollTopAfterPrepend(updates);

        if (isInvalid(rid)) {
          return;
        }

        updatePaddings(rid, updates);
        enqueueFetch(rid, updates);
        pending.shift();

        if (pending.length) fetch(rid);else {
          adapter.loading(false);
          bindEvents();
          adapter.calculateProperties();
        }
      });
    }

    function fetch(rid) {
      if (pending[0]) {
        // scrolling down
        if (buffer.length && !viewport.shouldLoadBottom()) {
          adjustBufferAfterFetch(rid);
        } else {
          fetchNext(function (result) {
            if (isInvalid(rid)) {
              return;
            }

            if (result.length < bufferSize) {
              buffer.eof = true;
            }

            if (result.length > 0) {
              viewport.clipTop();
              buffer.append(result);
            }

            adjustBufferAfterFetch(rid);
          });
        }
      } else {
        // scrolling up
        if (buffer.length && !viewport.shouldLoadTop()) {
          adjustBufferAfterFetch(rid);
        } else {
          fetchPrevious(function (result) {
            if (isInvalid(rid)) {
              return;
            }

            if (result.length < bufferSize) {
              buffer.bof = true;
              // log 'bof is reached'
            }

            if (result.length > 0) {
              if (buffer.length) {
                viewport.clipBottom();
              }
              buffer.prepend(result);
            }

            adjustBufferAfterFetch(rid);
          });
        }
      }
    }

    function resizeAndScrollHandler() {
      if (!$rootScope.$$phase && !adapter.isLoading && !adapter.disabled) {

        enqueueFetch(ridActual);

        if (pending.length) {
          unbindEvents();
        } else {
          adapter.calculateProperties();
          $scope.$apply();
        }
      }
    }

    function wheelHandler(event) {
      if (!adapter.disabled) {
        var scrollTop = viewport[0].scrollTop;
        var yMax = viewport[0].scrollHeight - viewport[0].clientHeight;

        if (scrollTop === 0 && !buffer.bof || scrollTop === yMax && !buffer.eof) {
          event.preventDefault();
        }
      }
    }
  }
}]);

},{'./modules/adapter.js':1,'./modules/buffer.js':2,'./modules/elementRoutines.js':3,'./modules/viewport.js':5}]},{},[6]);
}());