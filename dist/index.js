(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var DataSource, Injector, Resource, mod;

mod = angular.module('adminr-datasources', ['ngResource', 'ngStorage']);

Resource = require('./lib/Resource.coffee');

DataSource = require('./lib/DataSource.coffee');

Injector = require('./lib/Injector.coffee');

mod.provider('AdminrDataSources', function() {
  var DataSourcesProvider;
  DataSourcesProvider = (function() {
    function DataSourcesProvider() {}

    DataSourcesProvider.prototype.assignToScope = true;

    DataSourcesProvider.prototype.dataSources = {};

    DataSourcesProvider.prototype.createDataSource = function(name, url, options) {
      var dataSource;
      dataSource = new DataSource(name, url, options);
      this.dataSources[name] = dataSource;
      return dataSource;
    };

    DataSourcesProvider.prototype.deleteDataSource = function(name) {
      return delete this.dataSources[name];
    };

    DataSourcesProvider.prototype.getDataSource = function(name) {
      if (!name) {
        name = Object.keys(this.dataSources)[0];
      }
      return this.dataSources[name];
    };

    DataSourcesProvider.prototype.$get = [
      '$injector', function($injector) {
        Injector._$injector = $injector;
        return this;
      }
    ];

    return DataSourcesProvider;

  })();
  return new DataSourcesProvider();
});

mod.directive('adminrResource', function() {
  return {
    link: function(scope, elm, attrs) {
      var init, resource;
      elm.remove();
      resource = null;
      init = function() {
        scope.$eval(attrs.assign + ' = ' + attrs.init);
        resource = scope.$eval(attrs.assign);
        resource.emitErrors = true;
        attrs.onError = attrs.onError || '1';
        if (attrs.onInit) {
          scope.$eval(attrs.onInit);
        }
        if (attrs.onLoad) {
          resource.on('load', function() {
            return scope.$eval(attrs.onLoad);
          });
        }
        if (attrs.onSave) {
          resource.on('save', function() {
            scope.$eval(attrs.onSave);
            if (attrs.onSaveReinit) {
              return init();
            }
          });
        }
        if (attrs.onDelete) {
          resource.on('delete', function() {
            return scope.$eval(attrs.onSave);
          });
        }
        if (attrs.onError) {
          return resource.on('error', function() {
            return scope.$eval(attrs.onError);
          });
        }
      };
      return init();
    }
  };
});

mod.run([
  'AdminrDataSources', '$rootScope', function(AdminrDataSources, $rootScope) {
    var dataSource, dataSourceName, key, keys, ref, ref1, resource, results, results1;
    if (!AdminrDataSources.assignToScope) {
      return;
    }
    keys = Object.keys(AdminrDataSources.dataSources);
    if (keys.length === 1) {
      ref = AdminrDataSources.dataSources[keys[0]].resources;
      results = [];
      for (key in ref) {
        resource = ref[key];
        results.push($rootScope[key] = resource);
      }
      return results;
    } else {
      ref1 = AdminrDataSources.dataSources;
      results1 = [];
      for (dataSourceName in ref1) {
        dataSource = ref1[dataSourceName];
        $rootScope[dataSourceName] = {};
        results1.push((function() {
          var ref2, results2;
          ref2 = dataSource.resources;
          results2 = [];
          for (key in ref2) {
            resource = ref2[key];
            results2.push($rootScope[dataSourceName][key] = resource);
          }
          return results2;
        })());
      }
      return results1;
    }
  }
]);


},{"./lib/DataSource.coffee":2,"./lib/Injector.coffee":3,"./lib/Resource.coffee":4}],2:[function(require,module,exports){
var DataSource, Injector, Resource;

Resource = require('./Resource.coffee');

Injector = require('./Injector.coffee');

DataSource = (function() {
  DataSource.prototype.authorizationEndpoint = '/authorize';

  DataSource.prototype.resources = {};

  function DataSource(name1, url, options1) {
    this.name = name1;
    this.url = url;
    this.options = options1;
    this.options = this.options || {};
  }

  DataSource.prototype.isAuthorized = function() {
    return this.getAuthorizationToken() !== null;
  };

  DataSource.prototype._getStorage = function(type) {
    this._storages = this._storages || {};
    if (!this._storages[type]) {
      this._storages[type] = Injector._$injector.get('$' + type + 'Storage');
    }
    return this._storages[type];
  };

  DataSource.prototype.getAuthorizationToken = function() {
    var key, token;
    key = this.name + '_auth-token';
    token = this._getStorage('local')[key] || this._getStorage('session')[key] || null;
    return token;
  };

  DataSource.prototype.setAuthorizationToken = function(token, sessionOnly) {
    var key, storage;
    if (sessionOnly == null) {
      sessionOnly = false;
    }
    key = this.name + '_auth-token';
    delete this._getStorage('local')[key];
    delete this._getStorage('session')[key];
    if (token) {
      storage = this._getStorage(sessionOnly ? 'session' : 'local');
      return storage[key] = token;
    }
  };

  DataSource.prototype.getPublicUrlForPath = function(path) {
    var publicUrl;
    if (path == null) {
      path = '/';
    }
    publicUrl = this.url + path;
    if (publicUrl.indexOf('?') !== -1) {
      publicUrl = publicUrl + '&token=' + this.getAuthorizationToken();
    } else {
      publicUrl = publicUrl + '?token=' + this.getAuthorizationToken();
    }
    return publicUrl;
  };

  DataSource.prototype.addResource = function(name, path, paramDefaults, actions, options) {
    var headers, resource;
    if (options == null) {
      options = {};
    }
    resource = null;
    headers = {
      Authorization: (function(_this) {
        return function() {
          var token;
          token = _this.getAuthorizationToken();
          if (!token) {
            return null;
          }
          return 'Bearer ' + token;
        };
      })(this)
    };
    actions = {
      'get': {
        method: 'GET',
        headers: headers
      },
      'save': {
        method: '...',
        headers: headers
      },
      'post': {
        method: 'POST',
        headers: headers
      },
      'put': {
        method: 'PUT',
        headers: headers
      },
      'query': {
        method: 'GET',
        isArray: true,
        headers: headers
      },
      'remove': {
        method: 'DELETE',
        headers: headers
      },
      'delete': {
        method: 'DELETE',
        headers: headers
      }
    };
    resource = new Resource(this, this.url + path, paramDefaults, actions, options);
    this.resources[name] = resource;
    return resource;
  };

  DataSource.prototype.supportsRangeHeader = function() {
    return this.options.supportsRangeHeader;
  };

  DataSource.prototype.removeResource = function(name) {
    return delete this.resources[name];
  };

  DataSource.prototype.getResource = function(name) {
    return this.resources[name];
  };

  DataSource.prototype.authorize = function(username, password, sessionOnly) {
    var $http;
    if (sessionOnly == null) {
      sessionOnly = false;
    }
    $http = Injector._$injector.get('$http');
    return Injector._$injector.get('$q')((function(_this) {
      return function(resolve, reject) {
        return $http.post(_this.url + _this.authorizationEndpoint, {
          username: username,
          password: password
        }).then(function(response) {
          _this.setAuthorizationToken(response.data.token, sessionOnly);
          return resolve(response);
        })["catch"](function(error) {
          return reject(error);
        });
      };
    })(this));
  };

  DataSource.prototype.logout = function() {
    return this.setAuthorizationToken(null);
  };

  return DataSource;

})();

module.exports = DataSource;


},{"./Injector.coffee":3,"./Resource.coffee":4}],3:[function(require,module,exports){
module.exports = {
  _$injector: null
};


},{}],4:[function(require,module,exports){
var EventEmitter, Injector, Resource, ResourceContainer, contentRange,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Injector = require('./Injector.coffee');

contentRange = require('content-range');

EventEmitter = require('eventemitter2').EventEmitter2;

Resource = (function() {
  function Resource(dataSource, path, paramDefaults, actions1, options) {
    var methods;
    this.dataSource = dataSource;
    this.path = path;
    this.paramDefaults = paramDefaults;
    this.actions = actions1;
    this.options = options;
    methods = ['get', 'save', 'update', 'query', 'remove', 'delete'];
    methods.forEach((function(_this) {
      return function(method) {
        return _this[method] = function(params) {
          var container;
          container = new ResourceContainer(this, method, params);
          container.reload();
          return container;
        };
      };
    })(this));
  }

  Resource.prototype.create = function(params) {
    var container;
    container = new ResourceContainer(this, 'create', params);
    container.create();
    return container;
  };

  Resource.prototype.logout = function() {
    return this.dataSource.logout();
  };

  Resource.prototype.getMethod = function(container) {
    var resource;
    resource = this.getResource(container);
    return resource[container.method];
  };

  Resource.prototype.getResource = function(container) {
    var actions, resource;
    actions = angular.copy(this.actions);
    if (container && (actions != null ? actions[container.method] : void 0)) {
      actions[container.method].headers.Range = (function(_this) {
        return function() {
          var range, rangeFrom, rangeTo;
          if (_this.supportsRangeHeader()) {
            rangeFrom = container.range.offset || 0;
            rangeTo = container.range.limit ? (container.range.offset || 0) + container.range.limit - 1 : '*';
            range = "items=" + rangeFrom + '-' + rangeTo;
            return range;
          }
        };
      })(this);
    }
    resource = Injector._$injector.get('$resource')(this.path, this.paramDefaults, actions, this.options);
    resource.prototype.$save = function() {
      if (!this.id && !this._id) {
        return this.$post.apply(this, arguments);
      } else {
        return this.$put.apply(this, arguments);
      }
    };
    return resource;
  };

  Resource.prototype.supportsRangeHeader = function() {
    return this.dataSource.supportsRangeHeader();
  };

  return Resource;

})();

ResourceContainer = (function(superClass) {
  extend(ResourceContainer, superClass);

  ResourceContainer.prototype.emitErrors = false;

  ResourceContainer.prototype.data = null;

  ResourceContainer.prototype.error = null;

  ResourceContainer.prototype.resolved = true;

  ResourceContainer.prototype.range = null;

  ResourceContainer.prototype.$timeout = null;

  ResourceContainer.prototype.ignoreNextRangeUpdate = true;

  function ResourceContainer(resource1, method1, params) {
    this.resource = resource1;
    this.method = method1;
    if (params == null) {
      params = {};
    }
    ResourceContainer.__super__.constructor.apply(this, arguments);
    this.params = angular.copy(params);
    this.range = {
      unit: 'items'
    };
    if (this.params.limit) {
      this.range.limit = this.params.limit;
    }
    if (this.params.offset) {
      this.range.offset = this.params.offset;
    }
    if (isFinite(this.range.limit) && isFinite(this.range.offset)) {
      this.range.page = Math.floor(this.range.offset / this.range.limit) + 1;
    }
    this.$timeout = Injector._$injector.get('$timeout');
    this._scope = Injector._$injector.get('$rootScope').$new(true);
    this._scope.$watch((function(_this) {
      return function() {
        return _this.params;
      };
    })(this), (function(_this) {
      return function(value, oldValue) {
        if (value !== oldValue) {
          return _this.setNeedsReload();
        }
      };
    })(this), true);
    this._scope.$watch((function(_this) {
      return function() {
        return _this.range;
      };
    })(this), (function(_this) {
      return function(value, oldValue) {
        if (_this.ignoreNextRangeUpdate) {
          _this.ignoreNextRangeUpdate = false;
          return;
        }
        if ((value.page || 0) !== (oldValue.page || 0) && (value.offset || 0) === (oldValue.offset || 0)) {
          value.offset = (value.page - 1) * value.limit;
        }
        if ((value.offset || 0) !== (oldValue.offset || 0) || ((value.limit || 0) !== (oldValue.limit || 0) && oldValue.limit)) {
          return _this.setNeedsReload();
        }
      };
    })(this), true);
  }

  ResourceContainer.prototype.emit = function() {
    if (this.emitErrors) {
      return ResourceContainer.__super__.emit.apply(this, arguments);
    }
  };

  ResourceContainer.prototype.handleError = function(error) {
    var ref;
    this.resolved = true;
    if ((ref = error.status) === 401 || ref === 429) {
      this.resource.logout();
    }
    this.error = error;
    this.data = null;
    return this.emit('error', new Error('resource failed to load'));
  };

  ResourceContainer.prototype.setNeedsReload = function() {
    if (this._timeoutPromise) {
      this.$timeout.cancel(this._timeoutPromise);
    }
    return this._timeoutPromise = this.$timeout((function(_this) {
      return function() {
        _this.reload();
        return _this._timeoutPromise = null;
      };
    })(this), 200);
  };

  ResourceContainer.prototype.reload = function() {
    var $q, $timeout, deferred, newData, params;
    this.resolved = false;
    this.error = null;
    params = this.getParams();
    $q = Injector._$injector.get('$q');
    $timeout = Injector._$injector.get('$timeout');
    deferred = $q.defer();
    newData = this.resource.getMethod(this)(params, (function(_this) {
      return function(data, headers) {
        _this.resolved = true;
        _this.data = newData;
        _this.updateRange(params, headers('Content-Range'));
        _this.emit('load');
        return $timeout(function() {
          return deferred.resolve(data, headers);
        }, 0);
      };
    })(this), (function(_this) {
      return function(error) {
        _this.handleError(error);
        return deferred.reject(error);
      };
    })(this));
    return this.$promise = deferred.promise;
  };

  ResourceContainer.prototype.create = function() {
    var params, res;
    params = this.getParams();
    res = this.resource.getResource(this);
    return this.data = new res(params);
  };

  ResourceContainer.prototype.deleteItem = function(item) {
    this.resolved = false;
    return item.$delete().then((function(_this) {
      return function() {
        _this.resolved = true;
        return _this.reload();
      };
    })(this))["catch"](this.handleError.bind(this));
  };

  ResourceContainer.prototype.$save = function() {
    this.resolved = false;
    return this.data.$save.apply(this.data, arguments).then((function(_this) {
      return function() {
        _this.resolved = true;
        return _this.emit('save');
      };
    })(this))["catch"](this.handleError.bind(this));
  };

  ResourceContainer.prototype.$delete = function() {
    this.resolved = false;
    return this.data.$delete().then(function() {
      this.resolved = true;
      return this.emit('delete');
    })["catch"](this.handleError.bind(this));
  };

  ResourceContainer.prototype.getParams = function() {
    var params, ref, ref1;
    params = angular.copy(this.params);
    if (this.resource.supportsRangeHeader()) {
      params.limit = void 0;
      params.offset = void 0;
      return params;
    }
    if ((ref = this.resource.dataSource) != null ? (ref1 = ref.options) != null ? ref1.rangeToParamsHandler : void 0 : void 0) {
      return this.resource.dataSource.options.rangeToParamsHandler(this.range, params);
    } else {
      if (this.range.offset) {
        params.offset = this.range.offset;
      }
      if (this.range.limit) {
        params.limit = this.range.limit;
      }
      return params;
    }
  };

  ResourceContainer.prototype.updateRange = function(params, rangeHeader) {
    var limit, range, ref, ref1, ref2, ref3;
    this.ignoreNextRangeUpdate = true;
    if (rangeHeader) {
      range = contentRange.parse(rangeHeader);
      this.range.offset = range.start;
      this.range.end = range.end;
      limit = range.end - range.start + 1;
      if (params.limit) {
        this.range.limit = params.limit;
      }
      if (!this.range.limit || this.range.limit < limit) {
        this.range.limit = limit;
      }
      this.range.count = range.count;
    } else {
      if ((ref = this.resource.dataSource) != null ? (ref1 = ref.options) != null ? ref1.updateRangeHandler : void 0 : void 0) {
        if ((ref2 = this.resource.dataSource) != null) {
          if ((ref3 = ref2.options) != null) {
            ref3.updateRangeHandler(this.range, this.data, params);
          }
        }
      } else {
        this.range = this.range || {};
        this.range.offset = 0;
        if (this.data.count) {
          this.range.count = this.data.count;
        }
        if (params.limit) {
          this.range.limit = params.limit;
        }
        if (params.offset) {
          this.range.offset = params.offset;
        }
        if (params.page) {
          this.range.offset = (params.page - 1) * this.range.limit;
        }
      }
    }
    if (isFinite(this.range.limit) && isFinite(this.range.offset)) {
      return this.range.page = Math.floor(this.range.offset / this.range.limit) + 1;
    }
  };

  return ResourceContainer;

})(EventEmitter);

module.exports = Resource;


},{"./Injector.coffee":3,"content-range":5,"eventemitter2":6}],5:[function(require,module,exports){
(function (root, factory) {
  // AMD
  if (typeof define === 'function' && define.amd) define(['exports'], factory);
  // Common JS
  else if (typeof exports === 'object') factory(exports);
  // Global
  else factory((root.contentRange = {}));
}(this, function (exports) {

  /**
   * Expose module.
   */

  exports.format = format;
  exports.parse = parse;

  /**
   * Format the content-range header.
   *
   * @param {Object} options
   * @param {String} options.name
   * @param {Number} options.offset
   * @param {Number} options.limit
   * @param {Number} options.count
   */

  function format(options) {
    options.count = typeof options.count === 'undefined' || options.count === null ?
      '*' : options.count;

    var start = options.offset;
    var end = options.offset + options.limit - 1;

    if (end - start < 0) return options.name + ' */' + options.count;

    return options.name + ' ' + start + '-' + end + '/' + options.count;
  }

  /**
   * Parse the content-range header.
   *
   * @param {String} str
   * @returns {Object}
   */

  function parse(str) {
    var matches;

    if (matches = str.match(/^(\w+) (\d+)-(\d+)\/(\d+|\*)/)) return {
        name: matches[1],
        start: +matches[2],
        end: +matches[3],
        count: matches[4] === '*' ? null : +matches[4]
      };

    if (matches = str.match(/^(\w+) \*\/(\d+|\*)/)) return {
        name: matches[1],
        start: null,
        end: null,
        count: matches[2] === '*' ? null : +matches[2]
      };

    return null;
  }

}));
},{}],6:[function(require,module,exports){
/*!
 * EventEmitter2
 * https://github.com/hij1nx/EventEmitter2
 *
 * Copyright (c) 2013 hij1nx
 * Licensed under the MIT license.
 */
;!function(undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  function init() {
    this._events = {};
    if (this._conf) {
      configure.call(this, this._conf);
    }
  }

  function configure(conf) {
    if (conf) {

      this._conf = conf;

      conf.delimiter && (this.delimiter = conf.delimiter);
      conf.maxListeners && (this._events.maxListeners = conf.maxListeners);
      conf.wildcard && (this.wildcard = conf.wildcard);
      conf.newListener && (this.newListener = conf.newListener);

      if (this.wildcard) {
        this.listenerTree = {};
      }
    }
  }

  function EventEmitter(conf) {
    this._events = {};
    this.newListener = false;
    configure.call(this, conf);
  }

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }

    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }

        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();

    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name) {

      if (!tree[name]) {
        tree[name] = {};
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else if(typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        }
        else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;

            if (typeof this._events.maxListeners !== 'undefined') {
              m = this._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            tree._listeners.length);
              console.trace();
            }
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  }

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    this._events || init.call(this);
    this._events.maxListeners = n;
    if (!this._conf) this._conf = {};
    this._conf.maxListeners = n;
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function(event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    }

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function() {

    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
      if (!this._events.newListener) { return false; }
    }

    // Loop through the *_all* functions and invoke them.
    if (this._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        this._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {

      if (!this._all &&
        !this._events.error &&
        !(this.wildcard && this.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    var handler;

    if(this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    }
    else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      }
      else if (arguments.length > 1)
        switch (arguments.length) {
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
      return true;
    }
    else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        this.event = type;
        listeners[i].apply(this, args);
      }
      return (listeners.length > 0) || !!this._all;
    }
    else {
      return !!this._all;
    }

  };

  EventEmitter.prototype.on = function(type, listener) {

    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if(this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else if(typeof this._events[type] === 'function') {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
    else if (isArray(this._events[type])) {
      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {

        var m = defaultMaxListeners;

        if (typeof this._events.maxListeners !== 'undefined') {
          m = this._events.maxListeners;
        }

        if (m > 0 && this._events[type].length > m) {

          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          console.trace();
        }
      }
    }
    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    if(!this._all) {
      this._all = [];
    }

    // Add the function to the event listener collection.
    this._all.push(fn);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[];

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          continue;
        }

        if(this.wildcard) {
          leaf._listeners.splice(position, 1);
        }
        else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(this.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete this._events[type];
          }
        }
        return this;
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(this.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }
      }
    }

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else {
      if (!this._events[type]) return this;
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if(this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.listenersAny = function() {

    if(this._all) {
      return this._all;
    }
    else {
      return [];
    }

  };

  if (typeof define === 'function' && define.amd) {
     // AMD. Register as an anonymous module.
    define(function() {
      return EventEmitter;
    });
  } else if (typeof exports === 'object') {
    // CommonJS
    exports.EventEmitter2 = EventEmitter;
  }
  else {
    // Browser global.
    window.EventEmitter2 = EventEmitter;
  }
}();

},{}]},{},[1]);
