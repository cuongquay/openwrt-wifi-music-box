/**
 * Bootstrap require with the needed config, then load the app.js module.
 */
require.config({
	baseUrl : 'app',
	urlArgs : 'rev=@REV@',
	paths : {		
		'config' : 'components/panel.settings.min',		
		'kbn': 'components/kbn.min',
		'css' : '../vendor/require/css.min',
		'text' : '../vendor/require/text.min',
		'moment' : '../vendor/moment.min',
		'chromath' : '../vendor/chromath.min',
		'angular' : '../vendor/angular/angular.min',
		'angular-touch' : '../vendor/angular/angular-touch.min',
		'angular-route' : '../vendor/angular/angular-route.min',
		'angular-cookies' : '../vendor/angular/angular-cookies.min',
		'angular-sanitize' : '../vendor/angular/angular-sanitize.min',		
		'angular-strap' : '../vendor/angular/angular-strap.min',		
		'angular-loading-bar': '../vendor/angular/angular-loading-bar.min',
		'angular-animate': '../vendor/angular/angular-animate.min',
		'angular-table': '../vendor/angular/angular-table.min',		
		'angular-block-ui': '../vendor/angular/angular-block-ui.min',
		'bindonce' : '../vendor/angular/bindonce.min',		
		'lodash-src' : '../vendor/lodash.min',
		'bootstrap' : '../vendor/bootstrap/bootstrap.min',		
		'jquery' : '../vendor/jquery/jquery-2.0.2.min',
		'jquery-ui' : '../vendor/jquery/jquery-ui-1.10.3.min',
		'jquery-dropotron':	'../vendor/jquery/jquery.dropotron.min',
		'jquery-scrollex':	'../vendor/jquery/jquery.scrollex.min',
		'jquery-scrolly':	'../vendor/jquery/jquery.scrolly.min',
		'jquery-skel':	'../vendor/jquery/jquery.skel.min',
		'underscore' : '../vendor/underscore.min',
		'modernizr' : '../vendor/modernizr.min',							
		'd3': '../vendor/d3.v3.min',		
		'classie': '../vendor/classie.min',
		'numeral': '../vendor/numeral.min',
		'jsonpath': '../vendor/jsonpath.min',
		'lodash' : 'components/lodash.extended.min',
		'extend-jquery' : 'components/extend-jquery.min',		
		'elastic-lib': '../vendor/elasticjs/elastic-1.1.1.min',
		'elasticjs' : '../vendor/elasticjs/elastic-angular-client.min',
		'ui-bootstrap-tpls': '../vendor/bootstrap/ui-bootstrap-custom-tpls-0.11.0.min'
	},
	shim : {
		angular : {
			deps : ['jquery', 'config'],
			exports : 'angular'
		},

		bootstrap : {
			deps : ['jquery', 'angular-route', 'jquery-ui']
		},
		
		modernizr: {
	      exports: 'Modernizr'
	    },

		jquery : {
			exports : 'jQuery'
		},		
	    'superbox' :     ['jquery'],
		'angular-touch' : ['angular'],
		'angular-dragdrop' : ['angular'],
		'angular-animate' : ['angular'],
		'angular-table' : ['angular'],
		'angular-loading-bar' : ['angular', 'angular-animate'],		
		'angular-sanitize' : ['angular'],
		'angular-cookies' : ['angular'],
		'angular-loader' : ['angular'],		
		'angular-resource' : ['angular'],
		'angular-route' : ['angular'],
		'angular-touch' : ['angular'],		
		'angular-block-ui' : ['angular'],
		'angular-strap' : ['angular', 'bootstrap'],
		'bindonce' : ['angular'],		
		'elasticjs': ['angular', 'elastic-lib'],
		'spectrum':  ['jquery'],
        'jquery-ui': ['jquery'],
        'jquery-dropotron': ['jquery'],
        'jquery-scrollex': ['jquery'],
        'jquery-scrolly': ['jquery']
	},
	waitSeconds : 60
}); 