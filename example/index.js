var mod = angular.module('adminr-core-test',['adminr-datasources']);

mod.config(function(AdminrDataSourcesProvider){
    var datasource = AdminrDataSourcesProvider.createDataSource('Test','https://adminr-test-api.herokuapp.com',{
        supportsRangeHeader: true
    })
    datasource.addResource('Me','/me')
    datasource.addResource('User','/users/:id',{id:'@id'})
})


mod.controller('TestCtrl',function($scope, AdminrDataSources){
    $scope.datasource = AdminrDataSources.getDataSource('Test')
    //$scope.unauthorizedResource = $scope.datasource.getResource('Me').get()


    User = $scope.datasource.getResource('User')
    //$scope.users = User.query({limit:5,order:'username'})

    //$scope.user = User.create({username:'test_username'})

    //$scope.saveUser = function(){
    //    $scope.user.$save().then(function(){
    //        $scope.users.reload()
    //        $scope.user = User.create({username:'another_username'})
    //    })
    //}
})
