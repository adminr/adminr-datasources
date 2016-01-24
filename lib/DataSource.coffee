Resource = require('./Resource.coffee')
Injector = require('./Injector.coffee')

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
      @_storages[type] = Injector._$injector.get('$' + type + 'Storage')
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

  addResource: (name,path,paramDefaults,actions,options = {})->
    resource = null
    headers = {
      Authorization:()=>
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
    resource = new Resource(@,@url + path,paramDefaults,actions,options)
    @resources[name] = resource

  removeResource: (name)->
    delete @resources[name]

  getResource: (name)->
    return @resources[name]

  authorize: (username,password,sessionOnly = no)->
    $http = Injector._$injector.get('$http')
    return Injector._$injector.get('$q')((resolve,reject)=>
      $http.post(@url + @authorizationEndpoint,{username:username,password:password}).then((response)=>
        @setAuthorizationToken(response.data.token,sessionOnly)
        resolve(response)
      ).catch((error)->
        reject(error)
      )
    )

  logout: ()->
    @setAuthorizationToken(null)

module.exports = DataSource