var mod = angular.module('adminr-core-test',['adminr-datasources']);

mod.config(function(AdminrDataSourcesProvider){
    var datasource = AdminrDataSourcesProvider.createDataSource('Test','https://adminr-test-api.herokuapp.com')
    datasource.addResource('Me','/me')
    datasource.addResource('User','/users')
})


mod.controller('TestCtrl',function($scope, AdminrDataSources){
    $scope.datasource = AdminrDataSources.getDataSource('Test')
    $scope.unauthorizedResource = $scope.datasource.getResource('Me').get()
    $scope.users = $scope.datasource.getResource('User').get()
})