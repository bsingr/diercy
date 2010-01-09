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
	Diercy.myCore.addLevels();
	Diercy.myCore.createNetting();
	Diercy.myCore.calcGraph();
	return Diercy;
};
Diercy.renderWithRaphaelTo = function(target){
	var myDiercyGraph = this.myCore.graph;
	var renderer = new Diercy.Renderer.Raphael(myDiercyGraph);
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
	this.netting = [];
	this.graph = null;
	
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
        var parent = myDiercyCore.nodes[Diercy.Utils.find(myDiercyCore.nodes, 'id', this.id)];
        myDiercyCore.addLevel(parent, node.level -1, +1);
      });
      Diercy.Utils.each(node.childs,function(i){
        var child = myDiercyCore.nodes[Diercy.Utils.find(myDiercyCore.nodes, 'id', this.id)];
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
        var child = this;
        mesh.addFollower(child.id);
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
Diercy.Renderer.Raphael = function(myDiercyGraph){
	this.myDiercyGraph = myDiercyGraph;
	
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
		var myDiercyGraph = myRenderer.myDiercyGraph;
		
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
