mod = angular.module('adminr-datasources',['ngResource','ngStorage'])

Resource = require('./lib/Resource.coffee')
DataSource = require('./lib/DataSource.coffee')

Injector = require('./lib/Injector.coffee')

mod.provider('AdminrDataSources',()->

  class DataSourcesProvider
    assignToScope: yes
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

    $get:['$injector',($injector)->
      Injector._$injector = $injector
      return @
    ]

  return new DataSourcesProvider()
)

mod.directive('adminrResource',()->
  return {
    link:(scope,elm,attrs)->
      elm.remove()
      resource = null
      init = ()->
        scope.$eval(attrs.assign + ' = ' + attrs.init)
        resource = scope.$eval(attrs.assign)

        resource.emitErrors = yes

        attrs.onError = attrs.onError or '1'

        if attrs.onInit
          scope.$eval(attrs.onInit)
        if attrs.onLoad
          resource.on('load',()->
            scope.$eval(attrs.onLoad)
          )
        if attrs.onSave
          resource.on('save',()->
            scope.$eval(attrs.onSave)
            if attrs.onSaveReinit
              init()
          )
        if attrs.onDelete
          resource.on('delete',()->
            scope.$eval(attrs.onSave)
          )
        if attrs.onError
          resource.on('error',()->
            scope.$eval(attrs.onError)
          )

      init()
  }
)

mod.run(['AdminrDataSources','$rootScope',(AdminrDataSources,$rootScope)->
  if not AdminrDataSources.assignToScope
    return
  keys = Object.keys(AdminrDataSources.dataSources)
  if keys.length is 1
    for key,resource of AdminrDataSources.dataSources[keys[0]].resources
      $rootScope[key] = resource
  else
    for dataSourceName,dataSource of AdminrDataSources.dataSources
      $rootScope[dataSourceName] = {}
      for key,resource of dataSource.resources
        $rootScope[dataSourceName][key] = resource
])