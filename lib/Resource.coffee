Injector = require('./Injector.coffee')
contentRange = require('content-range')
EventEmitter = require('eventemitter2').EventEmitter2


class Resource
  constructor:(@dataSource,@path,@paramDefaults,@actions,@options)->

    methods = ['get','save','update','query','remove','delete']

    methods.forEach((method)=>
      @[method] = (params)->
        container = new ResourceContainer(@,method,params)
        container.setNeedsReload()
        return container
    )

  create:(params)->
    container = new ResourceContainer(@,'create',params)
    container.create()
    return container

  logout:()->
    @dataSource.logout()

  getMethod:(container)->
    resource = @getResource(container)
    return resource[container.method]

  getResource:(container)->
    actions = angular.copy(@actions)

    if container and actions?[container.method]
      actions[container.method].headers.Range = ()=>
        if @supportsRangeHeader()
          rangeFrom = (container.range.offset or 0)
          rangeTo = if container.range.limit then ((container.range.offset or 0) + container.range.limit - 1) else '*'
          range = "items=" + rangeFrom + '-' + rangeTo
          return range
    resource = Injector._$injector.get('$resource')(@path,@paramDefaults,actions,@options)

    resource.prototype.$save = ()->
      if not @id and not @_id
        return @$post.apply(@,arguments)
      else
        return @$put.apply(@,arguments)

    return resource

  supportsRangeHeader:()->
    return @dataSource.supportsRangeHeader()


class ResourceContainer extends EventEmitter
  emitErrors: no
  data: null
  error: null
  resolved: yes
  range: null
  $timeout: null
  constructor:(@resource,@method,params = {})->
    super
    @params = angular.copy(params)
    @range = {unit:'items'}
    if @params.limit
      @range.limit = @params.limit
    if @params.offset
      @range.offset = @params.offset
    if isFinite(@range.limit) and isFinite(@range.offset)
      @range.page = Math.floor(@range.offset/@range.limit)
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
      if (value.page or 0) isnt (oldValue.page or 0)
        value.offset = value.page*value.limit
      if (value.offset or 0) isnt (oldValue.offset or 0) or ((value.limit or 0) isnt (oldValue.limit or 0) and oldValue.limit)
        @setNeedsReload()
    ,yes)

  emit:()->
    if @emitErrors
      super

  handleError:(error)->
    @resolved = yes
    if error.status in [401,429]
      @resource.logout()
    @error = error
    @data = null
    @emit('error',new Error('resource failed to load'))

  setNeedsReload:()->
    if @_timeoutPromise
      @$timeout.cancel(@_timeoutPromise)
    @_timeoutPromise = @$timeout(()=>
      @reload()
      @_timeoutPromise = null
    ,200)

  reload:()->
    @resolved = no
    @error = null
    params = @getParams()

    newData = @resource.getMethod(@)(params,(data,headers)=>
      @resolved = yes
      @data = newData
      @updateRange(params,headers('Content-Range'))
      @emit('load')
    ,@handleError.bind(@))

  create:()->
    params = @getParams()
    res = @resource.getResource(@)
    @data = new res(params)


  deleteItem:(item)->
    @resolved = no
    item.$delete().then(()=>
      @resolved = yes
      @reload()
    ).catch(@handleError.bind(@))

  $save:()->
    @resolved = no
    @data.$save.apply(@data,arguments).then(()=>
      @resolved = yes
      @emit('save')
    ).catch(@handleError.bind(@))
  $delete:()->
    @resolved = no
    @data.$delete().then(()->
      @resolved = yes
      @emit('delete')
    ).catch(@handleError.bind(@))

  getParams:()->
    params = angular.copy(@params)

    if @resource.supportsRangeHeader()
      params.limit = undefined
      params.offset = undefined
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
      if params.limit
        @range.limit = params.limit
      if not @range.limit or @range.limit < limit
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
    if isFinite(@range.limit) and isFinite(@range.offset)
      @range.page = Math.floor(@range.offset/@range.limit)


module.exports = Resource