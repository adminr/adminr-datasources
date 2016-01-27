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
    actions[container.method].headers.Range = ()=>
      if @supportsRangeHeader()
        rangeFrom = (container.range.offset or 0)
        rangeTo = if container.range.limit then ((container.range.offset or 0) + container.range.limit - 1) else '*'
        range = "items=" + rangeFrom + '-' + rangeTo
        return range
    resource = Injector._$injector.get('$resource')(@path,@paramDefaults,actions,@options)
    return resource[container.method]

  supportsRangeHeader:()->
    return @dataSource.supportsRangeHeader()


class ResourceContainer
  data: null
  error: null
  loading: no
  range: null
  $timeout: null
  constructor:(@resource,@method,params = {})->
    @params = angular.copy(params)
    @range = {unit:'items'}
    @$timeout = Injector._$injector.get('$timeout')
    @_scope = Injector._$injector.get('$rootScope').$new(yes)

    @_scope.$watch(()=>
      return @params
    ,(value, oldValue)=>
      if value isnt oldValue
        @setNeedsReload()
    ,yes)
    @_scope.$watch(()=>
      return @range
    ,(value, oldValue)=>
      if (value.offset or 0) isnt (oldValue.offset or 0) or (value.limit or 0) isnt (oldValue.limit or 0)
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
      @error = error
    )

  getParams:()->
    params = angular.copy(@params)

    if @resource.supportsRangeHeader()
      return params
    if @resource.dataSource?.options?.rangeToParamsHandler
      return @resource.dataSource.options.rangeToParamsHandler(@range,params)
    else
      params.offset = @range.offset if @range.offset
      params.limit = @range.limit if @range.limit
      return params

  updateRange:(params,rangeHeader)->
    if rangeHeader
      range = contentRange.parse(rangeHeader)
      @range.offset = range.start
      @range.end = range.end
      limit = range.end - range.start + 1
      if @range.limit < limit
        @range.limit = limit
      @range.count = range.count
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