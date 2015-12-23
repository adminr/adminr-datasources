(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var DataSource, Injector, Resource, mod;

mod = angular.module('adminr-datasources', ['ngResource', 'ngStorage']);

Resource = require('./lib/Resource.coffee');

DataSource = require('./lib/DataSource.coffee');

Injector = require('./lib/Injector.coffee');

mod.provider('DataSources', function() {
  var DataSourcesProvider;
  DataSourcesProvider = (function() {
    function DataSourcesProvider() {}

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

  DataSource.prototype.addResource = function(name, path, paramDefualts, actions, options) {
    var headers;
    if (options == null) {
      options = {};
    }
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
        method: 'POST',
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
    return this.resources[name] = new Resource(this, this.url + path, paramDefualts, actions, options);
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
var Injector, Resource, ResourceContainer, contentRange;

Injector = require('./Injector.coffee');

contentRange = require('content-range');

Resource = (function() {
  function Resource(dataSource, path, paramDefualts, actions, options) {
    var methods;
    this.dataSource = dataSource;
    this.path = path;
    this.paramDefualts = paramDefualts;
    this.actions = actions;
    this.options = options;
    methods = ['get', 'save', 'query', 'remove', 'delete'];
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

  Resource.prototype.logout = function() {
    return this.dataSource.logout();
  };

  Resource.prototype.resource = function() {
    if (!this._resource) {
      this._resource = Injector._$injector.get('$resource')(this.path, this.paramDefaults, this.actions, this.options);
    }
    return this._resource;
  };

  Resource.prototype.getMethod = function(method) {
    return this.resource()[method];
  };

  return Resource;

})();

ResourceContainer = (function() {
  ResourceContainer.prototype.data = null;

  ResourceContainer.prototype.error = null;

  ResourceContainer.prototype.loading = false;

  ResourceContainer.prototype.$timeout = null;

  function ResourceContainer(resource, method1, params) {
    this.resource = resource;
    this.method = method1;
    if (params == null) {
      params = {};
    }
    this.$timeout = Injector._$injector.get('$timeout');
    this._scope = Injector._$injector.get('$rootScope').$new(true);
    this._scope.params = params;
    this.params = this._scope.params;
    this._scope.$watch('params', (function(_this) {
      return function() {
        return _this.setNeedsReload();
      };
    })(this), true);
  }

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
    this.loading = true;
    this.error = null;
    return this.resource.getMethod(this.method)(this._scope.params, (function(_this) {
      return function(data, headers) {
        var range;
        _this.loading = false;
        _this.data = data;
        range = headers('Content-Range');
        if (range) {
          return _this.range = contentRange.parse(range);
        }
      };
    })(this), (function(_this) {
      return function(error) {
        var ref;
        _this.loading = false;
        if ((ref = error.status) === 401 || ref === 429) {
          return _this.resource.logout();
        } else {
          return _this.error = error;
        }
      };
    })(this));
  };

  return ResourceContainer;

})();

module.exports = Resource;


},{"./Injector.coffee":3,"content-range":5}],5:[function(require,module,exports){
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
},{}]},{},[1]);
