define(['lodash'], function(_) {"use strict";	
	/** @scratch /configuration/config.js/2
	 * === Parameters
	 */
	return {		
		/** @scratch /configuration/config.js/5
	     *
	     * ==== elasticsearch
	     *
	     * The URL to your elasticsearch server. You almost certainly don't
	     * want +http://localhost:9200+ here. Even if Kibana and Elasticsearch are on
	     * the same host. By default this will attempt to reach ES at the same host you have
	     * kibana installed on. You probably want to set it to the FQDN of your
	     * elasticsearch host
	     *
	     * Note: this can also be an object if you want to pass options to the http client. For example:
	     *
	     *  +elasticsearch: {server: "http://localhost:9200", withCredentials: true}+
	     *
	     */

	    elasticsearch: '//wifioner.com/es'		
	};	
});
