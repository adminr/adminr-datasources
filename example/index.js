var mod = angular.module('adminr-core-test',['adminr-datasources']);

mod.config(function(DataSourcesProvider){
    var datasource = DataSourcesProvider.createDataSource('Test','https://adminr-test-api.herokuapp.com')
    datasource.addResource('Me','/me')
    datasource.addResource('User','/users')
})


mod.controller('TestCtrl',function($scope,DataSources){
    $scope.datasource = DataSources.getDataSource('Test')
    $scope.unauthorizedResource = $scope.datasource.getResource('Me').get()
    $scope.users = $scope.datasource.getResource('User').get()
})