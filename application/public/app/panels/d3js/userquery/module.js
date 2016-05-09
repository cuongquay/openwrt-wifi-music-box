/*

  ## query

  ### Parameters
  * query ::  A string or an array of querys. String if multi is off, array if it is on
              This should be fixed, it should always be an array even if its only
              one element
*/
define([
  'angular',
  'app',
  'lodash',

  'css!./userquery.css'
], function (angular, app, _) {
  'use strict';

  var module = angular.module('kibana.panels.userquery', []);
  app.useModule(module);

  module.controller('userquery', [ '$scope', 'querySrv', '$rootScope', 'dashboard', '$q', '$modal', function($scope, querySrv, $rootScope, dashboard, $q, $modal) {
    $scope.panelMeta = {
      status  : "Stable",
      description : "Manage all of the queries on the dashboard. You almost certainly need one of "+
        "these somewhere. This panel allows you to add, remove, label, pin and color queries"
    };

    // Set and populate defaults
    var _d = {
      query   : "*",
      pinned  : true,
      history : [],      
      remember: 10 // max: 100, angular strap can't take a variable for items param
    };
    
    // set default field
    var _email = { field : 'email'};
    for(var i = 0; i < querySrv.ids.length; i++)
    {
    	var id = querySrv.ids[i];    	
    	if(_.isUndefined(querySrv.list[id].field))
    	{    		
    		_.extend(querySrv.list[id],_email);
    	}
    }
    
    //var fields = [{name:'email', active:false},{name:'Ip', active:false},{name:'all', active:false}];
    var fields = ['email','user_ip','_all'];
    
    _.defaults($scope.panel,_d);

    $scope.querySrv = querySrv;

    // A list of query types for the query config popover
    $scope.queryTypes = querySrv.types;

    $scope.init = function() {
    };
    
    $scope.visibleAddBtn = function()
  	{  		
	  	for(var i = 0; i < fields.length; i++)
	  	{
	  		var temp = false;
	  		for(var j = 0; j < querySrv.ids.length; j++)
	  		{	
	  			var id = querySrv.ids[j];
	  			if(fields[i] == querySrv.list[id].field)
	  			{
	  				temp = true;
	  			}
	  		}	
	  		if(temp == false)
	  		{
	  			return true;
	  		}	  		
	  	}
	  	return false;
  	};	
  	
  	$scope.nextField = function()
  	{  		
	  	for(var i = 0; i < fields.length; i++)
	  	{
	  		var temp = false;
	  		for(var j = 0; j < querySrv.ids.length; j++)
	  		{	
	  			var id = querySrv.ids[j];
	  			if(fields[i] == querySrv.list[id].field)
	  			{
	  				temp = true;
	  			}
	  		}	  		
	  		if(temp == false)
	  		{
	  			return fields[i];
	  		}	  		
	  	}
	  	return '';
  	};
    
    $scope.add = function()
  	{
	  	var _query = {
	      alias: '',
	      pin: false,
	      type: 'lucene',
	      enable: true,
	      field: $scope.nextField()
	    };
  		querySrv.set(_query);
  	};	

    $scope.refresh = function() {
      update_history(_.pluck($scope.querySrv.list,'query'));
      dashboard.refresh();
    };

    $scope.render = function() {
      $rootScope.$broadcast('render');
    };
    
    $scope.queryIcon = function(type) {
      return querySrv.queryTypes[type].icon;
    };
    
    var update_history = function(query) {
      if($scope.panel.remember > 0) {
        $scope.panel.history = _.union(query.reverse(),$scope.panel.history);
        var _length = $scope.panel.history.length;
        if(_length > $scope.panel.remember) {
          $scope.panel.history = $scope.panel.history.slice(0,$scope.panel.remember);
        }
      }
    };

    $scope.init();

  }]);

});