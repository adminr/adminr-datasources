mod = angular.module('adminr-datasources',['ngResource','ngStorage'])

Resource = require('./lib/Resource.coffee')
DataSource = require('./lib/DataSource.coffee')

Injector = require('./lib/Injector.coffee')

mod.provider('DataSources',()->

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

    $get:['$injector',($injector)->
      Injector._$injector = $injector
      return @
    ]

  return new DataSourcesProvider()
)