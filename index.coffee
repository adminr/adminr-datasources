mod = angular.module('adminr-datasources',['ngResource','ngStorage'])

mod.provider('DataSources',()->

  _$injector = null

  class Resource
    constructor:(@dataSource,@path,@paramDefualts,@actions,@options)->

      methods = ['get','save','query','remove','delete']

      for method in methods
        @[method] = ()->
          params = new Array(arguments)
          params.shift(@resource)
          return _$injector.get('$q')((resolve,reject)=>
            @resource().query.apply(params).$promise.then(resolve).catch((error)=>
              console.log(@)
              if error.status in [401,429]
                @dataSource.logout()
              reject(error)
            )
          )

    resource:()->
#      if not _$resource
#        throw new Error('ngResource is not assigned yet (probably due to manipulation with resource methods in config state)')
      if not @_resource
        @_resource = _$injector.get('$resource')(@path,@paramDefaults,@actions,@options)
      return @_resource

  class DataSource
    authorizationEndpoint: '/authorize'

    resources: {}

    constructor: (@name,@url,@options)->
      @options = @options or {}

    isAuthorized:()->
      return @getAuthorizationToken() isnt null

    _getStorage:(type)->
      @_storages = @_storages or {}
      if not @_storages[type]
        @_storages[type] = _$injector.get('$' + type + 'Storage')
      return @_storages[type]

    getAuthorizationToken:()->
      key = @name + '_auth-token'
      token = @_getStorage('local')[key] or @_getStorage('session')[key] or null
      return token
    setAuthorizationToken:(token,sessionOnly = no)->
      key = @name + '_auth-token'
      delete @_getStorage('local')[key]
      delete @_getStorage('session')[key]
      if token
        storage = @_getStorage(if sessionOnly then 'session' else 'local')
        storage[key] = token

    addResource: (name,path,paramDefualts,actions,options = {})->
      headers = {Authorization:()=>
        token = @getAuthorizationToken()
        if not token
          return null
        return 'Bearer ' + token
      }

      actions = {
        'get':    {method:'GET',headers:headers},
        'save':   {method:'POST',headers:headers},
        'query':  {method:'GET', isArray:true,headers:headers},
        'remove': {method:'DELETE',headers:headers},
        'delete': {method:'DELETE',headers:headers}
      }
      console.log(actions)
      @resources[name] = new Resource(@,@url + path,paramDefualts,actions,options)

    removeResource: (name)->
      delete @resources[name]

    getResource: (name)->
      return @resources[name]

    authorize: (username,password,sessionOnly = no)->
      $http = _$injector.get('$http')
      $http.post(@url + @authorizationEndpoint,{username:username,password:password}).then((response)=>
        @setAuthorizationToken(response.data.token,sessionOnly)
      ).catch((error)->
        console.log('error',error)
      )

    logout: ()->
      @setAuthorizationToken(null)



  class DataSourcesProvider
    dataSources: {}

    createDataSource: (name,url,options)->
      dataSource = new DataSource(name,url,options)
      @dataSources[name] = dataSource
      return dataSource

    deleteDataSource: (name)->
      delete @dataSources[name]

    getDataSource:(name)->
      if not name
        name = Object.keys(@dataSources)[0]
      return @dataSources[name]

    $get:($resource,$q,$injector)->
      _$resource = $resource
      _$q = $q
      _$injector = $injector
      return @

  return new DataSourcesProvider()
)