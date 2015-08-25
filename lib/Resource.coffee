Injector = require('./Injector.coffee')

class Resource
  constructor:(@dataSource,@path,@paramDefualts,@actions,@options)->

    methods = ['get','save','query','remove','delete']

    methods.forEach((method)->
      @[method] = ()->
        args = arguments
#        params = new Array(arguments)
#        params.shift(@resource)
        return Injector._$injector.get('$q')((resolve,reject)=>
          @resource()[method].apply(@resource,args).$promise.then(resolve).catch((error)=>
            if error.status in [401,429]
              @dataSource.logout()
            reject(error)
          )
        )
    )

  resource:()->
    if not @_resource
      @_resource = Injector._$injector.get('$resource')(@path,@paramDefaults,@actions,@options)
    return @_resource

module.exports = Resource