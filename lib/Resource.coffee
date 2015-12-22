Injector = require('./Injector.coffee')
contentRange = require('content-range')



class Resource
  constructor:(@dataSource,@path,@paramDefualts,@actions,@options)->

    methods = ['get','save','query','remove','delete']

    methods.forEach((method)=>
      @[method] = (params)->
        container = new ResourceContainer(@resource(),method,params)
        container.reload()
        return container
    )


  resource:()->
    if not @_resource
      @_resource = Injector._$injector.get('$resource')(@path,@paramDefaults,@actions,@options)
    return @_resource


class ResourceContainer
  data: null
  error: null
  loading: no
  $timeout: null
  constructor:(@resource,@method,params = {})->
    @$timeout = Injector._$injector.get('$timeout')
    @_scope = Injector._$injector.get('$rootScope').$new(yes)
    @_scope.params = params
    @params = @_scope.params

    @_scope.$watch('params',()=>
      @setNeedsReload()
    ,yes)

  setNeedsReload:()->
    if @_timeoutPromise
      @$timeout.cancel(@_timeoutPromise)
    @_timeoutPromise = @$timeout(()=>
      @reload()
      @_timeoutPromise = null
    ,200)
  reload:()->
    @loading = yes
    @error = null
    @resource[@method](@_scope.params,(data,headers)=>
      @loading = no
      @data = data
      range = headers('Content-Range')
      if range
        @range = contentRange.parse(range)
    ,(error)=>
      @loading = no
      @error = error
    )



module.exports = Resource