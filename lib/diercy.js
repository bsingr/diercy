// // // // //// /// //
// // // // //// /// //
//
//            CONTAINER
// // /// //// ///// //
Diercy = {
	myCore: null
};
Diercy.v = '0.0.8';
Diercy.take = function(data){
	Diercy.myCore = new Diercy.Core(data);
	Diercy.myCore.createRoutes();
	//Diercy.myCore.addParents();
	//Diercy.myCore.addLevels();
	//Diercy.myCore.createNetting();
	//Diercy.myCore.calcGraph();
	return Diercy;
};
Diercy.renderWithRaphaelTo = function(target){
	var myDiercyCore = this.myCore;
	var renderer = new Diercy.Renderer.Raphael(myDiercyCore);
	renderer.render(target);
};

// // // // //// /// //
// // // // //// /// //
//
//            UTILITIES
// // /// //// ///// //
Diercy.Utils = {};
Diercy.Utils.each = function (array, iteration) {
  for(var i = 0; i < array.length; i++){
    if (iteration.call(array[i],i) === false ) {
      break;
    }
  }
};
Diercy.Utils.find = function (jsonArray, key, val) {
  var index;
  Diercy.Utils.each(jsonArray,function(i){
    if (val == this[key]) {
      index = i;
      return false;
    }
  });
  return index;
};


// // // // //// /// //
// // // // //// /// //
//
//                 CORE
// // /// //// ///// //
Diercy.Core = function(data){
	this.nodes = data;
	this.routes = null;
	this.longestRoute = null;
	this.indexOfLongestRoute = null;
	this.netting = [];
	this.graph = null;
	
	this.createRoutes = function() {
		var myDiercyCore = this;
		myDiercyCore.routes = [];
		myDiercyCore.longestRoute = [];
		myDiercyCore.indexOfLongestRoute = 0;
		
		// build compressed routes and determine longest
		Diercy.Utils.each(myDiercyCore.nodes, function(i){
			var node = this;
			var newRoute = [];
			var tempRoutes = myDiercyCore.createRoute(node, newRoute)
			myDiercyCore.routes.concat(tempRoutes);
		});
		
		console.log(myDiercyCore.routes);
		
		// expand routes
		var longestRoute = myDiercyCore.routes[myDiercyCore.indexOfLongestRoute];
		Diercy.Utils.each(myDiercyCore.routes, function(indexOfRoute){
			var route = this;
			var expandedRoute = [];
			
			Diercy.Utils.each(longestRoute, function(level){
				var node1 = longestRoute[level];
				
				Diercy.Utils.each(route, function(ii){
					var node2 = route[ii];
					if (node1 == node2) {
						expandedRoute[level] = node1;
						return false;
					}
				});
				
				if (!expandedRoute[level]) {
					expandedRoute[level] = null;
				}
				
			});
			myDiercyCore.routes[indexOfRoute] = expandedRoute;
		});
	};
	
	this.createRoute = function(node, route) {
		var myDiercyCore = this;
		var newRoute = route;
		if (!node.routes) { // cache but still buggy..
			newRoute.push(node.id); // append self
			if (node.childs.length) { // not end-node
				var newRoutes = [];
				Diercy.Utils.each(node.childs, function(i){
					var childNodeId = this;
					var childNode = myDiercyCore.nodes[Diercy.Utils.find(myDiercyCore.nodes, 'id', childNodeId)];
					var subRoutes = myDiercyCore.createRoute(childNode, newRoute.concat([]));
					newRoutes.concat(subRoutes);
				});
				node.routes = newRoutes;
			} else { // end-node
				if (newRoute.length > myDiercyCore.longestRoute.length) {
					myDiercyCore.longestRoute = newRoute;
				}
				node.routes = [newRoute];
			} 
		}
		return node.routes;
	};

	this.addParents = function() {
		var myDiercyCore = this;
		Diercy.Utils.each(myDiercyCore.nodes, function(i){
			var node = this;
			if (!node.parents) {
				node.parents = [];
			}
			Diercy.Utils.each(node.childs, function(j){
				var childNodeId = this;
				var childNode = myDiercyCore.nodes[Diercy.Utils.find(myDiercyCore.nodes, 'id', childNodeId)];
				if (!childNode.parents) {
					childNode.parents = [];
				}
				childNode.parents.push(node.id);
			});
		});
	};
	
	this.addLevels = function(){
		var myDiercyCore = this;
	  //levelling
	  myDiercyCore.addLevel(myDiercyCore.nodes[0],0,0);
	  //sorting    
	  myDiercyCore.nodes.sort(function(a,b){
	    return a.level - b.level;
	  });
	  //shift level to begin at "0"
	  // suppose the minlevel can only be <0, not >0
	  var minlevel = myDiercyCore.nodes[0].level;
	  if (minlevel < 0) {
	    Diercy.Utils.each(myDiercyCore.nodes, function(i){
	      this.level -= minlevel; 
	    });
	  }
	};

  this.addLevel = function(node, proposedLevel, direction){
    var myDiercyCore = this;
    if (!node.preventFromTraverse){
      node.level = proposedLevel;
    } else {
      if (direction > 0) { // child
        if ( node.level < proposedLevel ) {
          //
        } else if (node.level > proposedLevel) {
          node.level = proposedLevel;
          node.preventFromTraverse = false;
        } else { // ==
          //
        }
      } else if (direction < 0) { // parent
        if ( node.level < proposedLevel ) {
          node.level = proposedLevel;
          node.preventFromTraverse = false;
        } else if (node.level > proposedLevel) {
          //
        } else { // ==
          node.level = proposedLevel;
          node.preventFromTraverse = false;
        }
      }
    }
    if (!node.preventFromTraverse){
      node.preventFromTraverse = true;
      Diercy.Utils.each(node.parents,function(i){
				var id = this;
        var parent = myDiercyCore.nodes[Diercy.Utils.find(myDiercyCore.nodes, 'id', id)];
        myDiercyCore.addLevel(parent, node.level -1, +1);
      });
      Diercy.Utils.each(node.childs,function(i){
	      var id = this;
        var child = myDiercyCore.nodes[Diercy.Utils.find(myDiercyCore.nodes, 'id', id)];
        myDiercyCore.addLevel(child, node.level +1, -1);
      });
    }
  };

	this.createNetting = function () {
		this.createResidents();
		this.meshGaps();
	};

  this.createResidents = function () {
    var myDiercyCore = this;
    Diercy.Utils.each(myDiercyCore.nodes,function(i){
      var node = this;
      if (!myDiercyCore.netting[node.level]) {
        myDiercyCore.netting[node.level] = [];
      }
      var mesh = new Diercy.Core.Mesh(node.id, true);
      Diercy.Utils.each(node.childs,function(ii){
        var childId = this;
        mesh.addFollower(childId);
      });
      myDiercyCore.netting[node.level].push(mesh);
    });
  };

  this.meshGaps = function () {
    var myDiercyCore = this;
    Diercy.Utils.each(myDiercyCore.netting,function(currLevel){
      var currLevelMeshes = this;
      if (currLevel > 0) {
        var prevLevelMeshes = myDiercyCore.netting[currLevel - 1];
        Diercy.Utils.each(prevLevelMeshes, function(i){
          var prevMesh = this;
          var meshedFollowers = {};
          Diercy.Utils.each(currLevelMeshes, function(ii){
            var currMesh = this;
            if (prevMesh.leads(currMesh)) {
              meshedFollowers[currMesh.id] = true;
            }
          });
          Diercy.Utils.each(prevMesh.followers, function(ii){
            var followerId = this;
            if (!meshedFollowers[followerId]) {
              var newMesh = new Diercy.Core.Mesh(prevMesh.id, false);
              newMesh.addFollower(followerId);
              myDiercyCore.netting[currLevel].push(newMesh);
            }
          });

        });
      }
    });
  };
  this.calcGraph = function () {
    var myDiercyCore = this;
		myDiercyCore.graph = new Diercy.Core.Graph();
    Diercy.Utils.each(myDiercyCore.netting, function(level){
      var levelMeshes = this;
      var lastResidentMesh = null;
      var lastResidentX = null;
      Diercy.Utils.each(levelMeshes, function(i){
        var mesh = this;
        var y = level;
        var x = i - levelMeshes.length / 2;
        myDiercyCore.graph.add(level, x, y, mesh);
      });
    });
  };
};

Diercy.Core.Graph = function() {
  this.graph = [];
  this.getGraph = function(){return this.graph;};
  this.add = function(level, x, y, content){
    if (!this.graph[level]){
      this.graph[level] = [];
    }
    this.graph[level].push([x, y, content]);
  };
}

Diercy.Core.Mesh = function(id, isResident){
  this.id = id;
  this.isResident = isResident;
  this.followers = [];
  this.addFollower = function(followerId){
    this.followers.push(followerId);
  };
  this.leads = function(aFollower){
    var leads = false;
    if (this.isResident) {
      if (aFollower.isResident) {
        Diercy.Utils.each(this.followers, function(i){
          var followerId = this;
          if (followerId == aFollower.id) {
            leads = true
            return false;
          }
        });
      } else {
        if(this.id == aFollower.id) {
          leads = true;
        }
      }
    } else {
      if (this.followers[0] == aFollower.id) {
        leads = true;
      } else if (this.id == aFollower.id && this.followers[0] == aFollower.followers[0] ) {
        leads = true;
      }
    }
    return leads;
  };
}

// // // // //// /// //
// // // // //// /// //
//
//            RENDERING
// // /// //// ///// //
Diercy.Renderer = {};
Diercy.Renderer.Raphael = function(myDiercyCore){
	this.myDiercyCore = myDiercyCore;
	
	this.page = {
    x: 800,
    y: 800
  };
  this.margin = {
    x: 60,
    y: 60
  };

	this.render = function(domId) {
		var myRenderer = this;
		var myDiercyCore = myRenderer.myDiercyCore;
		
		var r = Raphael(domId, myRenderer.page.x, myRenderer.page.y);
		
		var levels = myDiercyCore.routes[0].length;
		for(var level = 0; level < levels; level++) {
			Diercy.Utils.each(myDiercyCore.routes,function(i){
				var route = this;
				var routeNode = route[level];
//				r.circle(i*10+50, level*10+50, 3);
				var text = '';
				if (routeNode) {
					text = routeNode;
				} else {
					text = '-';
				}
				r.text(i*15+10, level*15+10, text);
			});
		}
	};

	this.render2 = function(domId) {
		var myRenderer = this;
		var myDiercyGraph = myRenderer.myDiercyCore.graph;
		
		var r = Raphael(domId, myRenderer.page.x, myRenderer.page.y);

	  Diercy.Utils.each(myDiercyGraph.graph,function(level){
	    var levelElements = this;
	    Diercy.Utils.each(levelElements, function(i){
				
	      var el = {x: this[0], y: this[1], content: this[2]};
	      var x = myRenderer.page.x/2 + myRenderer.margin.x * el.x;
	      var y = myRenderer.page.y/6 + myRenderer.margin.y * el.y;

	      if (el.content.isResident){
	        r.circle(x, y, 9).attr({stroke: '#ccc'});
	        r.text(x,y,el.content.id);
	      } else {
	        r.path('M'+x+' '+(y-10)+'L'+x+' '+(y+10));
	        r.text((x+15),y,el.content.id+'-'+el.content.followers[0]);
	      }

	      var nextLevelElements = myDiercyGraph.graph[level + 1];
	      if (nextLevelElements) {
	       Diercy.Utils.each(nextLevelElements, function(j){
	          var followingEl = {x: this[0], y: this[1], content: this[2]};
	          if (el.content.leads(followingEl.content)) {
	            var x2 = myRenderer.page.x/2 + myRenderer.margin.x * followingEl.x;
	            var y2 = myRenderer.page.y/6 + myRenderer.margin.y * followingEl.y;

	            var path = 'M'+x+' '+(y+10)+'L'+x+' '+(y+20)+'L'+x2+' '+(y2-20)+'L'+x2+' '+(y2-10);

	            r.path(path);
	          }
	        });
	      }
	    });
	  });
	};	
};
