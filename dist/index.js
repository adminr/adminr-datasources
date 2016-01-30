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
    return this.resources[name] = resource;
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
var Injector, Resource, ResourceContainer, contentRange;

Injector = require('./Injector.coffee');

contentRange = require('content-range');

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
      if (!this.id) {
        return this.$post();
      } else {
        return this.$put();
      }
    };
    return resource;
  };

  Resource.prototype.supportsRangeHeader = function() {
    return this.dataSource.supportsRangeHeader();
  };

  return Resource;

})();

ResourceContainer = (function() {
  ResourceContainer.prototype.data = null;

  ResourceContainer.prototype.error = null;

  ResourceContainer.prototype.resolved = true;

  ResourceContainer.prototype.range = null;

  ResourceContainer.prototype.$timeout = null;

  function ResourceContainer(resource1, method1, params) {
    this.resource = resource1;
    this.method = method1;
    if (params == null) {
      params = {};
    }
    this.params = angular.copy(params);
    this.range = {
      unit: 'items'
    };
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
        if ((value.offset || 0) !== (oldValue.offset || 0) || (value.limit || 0) !== (oldValue.limit || 0)) {
          return _this.setNeedsReload();
        }
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
    var params;
    this.resolved = false;
    this.error = null;
    params = this.getParams();
    return this.data = this.resource.getMethod(this)(params, (function(_this) {
      return function(data, headers) {
        _this.resolved = true;
        return _this.updateRange(params, headers('Content-Range'));
      };
    })(this), (function(_this) {
      return function(error) {
        var ref;
        _this.resolved = true;
        if ((ref = error.status) === 401 || ref === 429) {
          _this.resource.logout();
        }
        return _this.error = error;
      };
    })(this));
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
    })(this));
  };

  ResourceContainer.prototype.$save = function() {
    this.resolved = false;
    return this.data.$save().then((function(_this) {
      return function() {
        return _this.resolved = true;
      };
    })(this));
  };

  ResourceContainer.prototype.$delete = function() {
    this.resolved = false;
    return this.data.$delete().then(function() {
      return this.resolved = true;
    });
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
      return this.range.count = range.count;
    } else {
      if ((ref = this.resource.dataSource) != null ? (ref1 = ref.options) != null ? ref1.updateRangeHandler : void 0 : void 0) {
        return (ref2 = this.resource.dataSource) != null ? (ref3 = ref2.options) != null ? ref3.updateRangeHandler(this.range, this.data, params) : void 0 : void 0;
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
          return this.range.offset = params.page * this.range.limit;
        }
      }
    }
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
