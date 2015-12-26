Injector = require('./Injector.coffee')
contentRange = require('content-range')



class Resource
  constructor:(@dataSource,@path,@paramDefaults,@actions,@options)->

    methods = ['get','save','query','remove','delete']

    methods.forEach((method)=>
      @[method] = (params)->
        container = new ResourceContainer(@,method,params)
        container.reload()
        return container
    )

  logout:()->
    @dataSource.logout()

  getMethod:(container)->
    actions = angular.copy(@actions)
    actions[container.method].headers.Range = ()->
      if container.params?.range
        return contentRange.format(container.params.range)
    resource = Injector._$injector.get('$resource')(@path,@paramDefaults,actions,@options)
    return resource[container.method]


class ResourceContainer
  data: null
  error: null
  loading: no
  range: {name:'items'}
  $timeout: null
  constructor:(@resource,@method,@params = {})->
    @$timeout = Injector._$injector.get('$timeout')
    @_scope = Injector._$injector.get('$rootScope').$new(yes)

    @_scope.$watch(()=>
      return @params
    ,()=>
      @setNeedsReload()
    ,yes)
    @_scope.$watch(()=>
      @range
    ,()=>
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
    params = @getParams()
    @resource.getMethod(@)(params,(data,headers)=>
      @loading = no
      @data = data
      @updateRange(params,headers('Content-Range'))
    ,(error)=>
      @loading = no
      if error.status in [401,429]
        @resource.logout()
      else
        @error = error
    )

  getParams:()->
    params = angular.copy(@params)

    if @resource.dataSource?.options?.useRangeHeaderOnly
      return params

    if @resource.dataSource?.options?.rangeToParamsHandler
      return @resource.dataSource.options.rangeToParamsHandler(@range,params)
    else
      params.offset = @range.offset
      params.limit = @range.limit
      return params

  updateRange:(params,rangeHeader)->
    if rangeHeader
      @range = contentRange.parse(rangeHeader)
    else
      if @resource.dataSource?.options?.updateRangeHandler
        @resource.dataSource?.options?.updateRangeHandler(@range,@data,params)
      else
        @range = @range or {}
        @range.offset = 0
        if @data.count
          @range.count = @data.count
        if params.limit
          @range.limit = params.limit
        if params.offset
          @range.offset = params.offset
        if params.page
          @range.offset = params.page * @range.limit


module.exports = Resource