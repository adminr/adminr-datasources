Injector = require('./Injector.coffee')
contentRange = require('content-range')

class Resource
  constructor:(@dataSource,@path,@paramDefualts,@actions,@options)->

    methods = ['get','save','query','remove','delete']

    methods.forEach((method)=>
      @[method] = (args)->
        results = @resource()[method](args,(data,headers)->
          range = headers('Content-Range')
          if range
            results.range = contentRange.parse(range)
        ,(error)->
          results.error = error
        )
        return results
    )

  resource:()->
    if not @_resource
      @_resource = Injector._$injector.get('$resource')(@path,@paramDefaults,@actions,@options)
    return @_resource

module.exports = Resource