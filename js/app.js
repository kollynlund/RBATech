// GLOBALS
window.jsonpCallback = function () { return true; };
String.prototype.toProperCase = function () {
  return this.replace(/\b\w+/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

(function(app){
  // ROUTES
  function Config($stateProvider, $urlRouterProvider, $sceDelegateProvider) {
    $urlRouterProvider.otherwise('/');

    $stateProvider
      .state('home', {
        url: '/',
        templateUrl: 'templates/home.html',
        controller: 'HomeController as hc'
      })

      .state('about', {
        url: '/about',
        templateUrl: 'templates/about.html'
      })

      .state('faculty', {
        url: '/faculty',
        templateUrl: 'templates/faculty.html',
        controller: 'FacultyController as fc'
      })

      .state('technologies', {
        url: '/technologies',
        templateUrl: 'templates/technologies.html',
        controller: 'TechnologiesController as tc',
        resolve: {
          technologies: function(TechnologyDetails) {
            return TechnologyDetails.checkForTechnologyLoaded();
          }
        }
      })
        .state('technology', {
          url: '/technology/{tech_id}',
          templateUrl: 'templates/technology.html',
          controller: 'TechnologyController as stc',
          resolve: {
            technologies: function(TechnologyDetails) {
              return TechnologyDetails.checkForTechnologyLoaded();
            },
            technology: function($stateParams, TechnologyDetails) {
              return TechnologyDetails.getSingleTechnology($stateParams.tech_id);
            }
          }
        })

      .state('resources', {
        url: '/resources',
        templateUrl: 'templates/resources.html',
        controller: 'GenericController as gc'
      })

      .state('contact', {
        url: '/contact',
        templateUrl: 'templates/contact.html',
        controller: 'ContactController as cc'
      });

    $sceDelegateProvider.resourceUrlWhitelist([
      'self',
      'http*://www.youtube.com**',
      'http*://youtube.com**',
      'youtube.com**',
      'http*://www.vimeo.com**',
      'http*://vimeo.com**',
      'vimeo.com**',
    ]);
  };

  // CUSTOM DIRECTIVES AND FILTERS
  function bindVideoSize($window, $timeout, VideoSize) {
    return {
      restrict: 'A',
      replace: false,
      link: function(scope, element) {
        function bindSize() {
          scope.$apply(function() {
            VideoSize.dimensions.width = element[0].clientWidth;
            VideoSize.dimensions.height = element[0].clientHeight;
          });
        };
        $window.onresize = bindSize;
        // Allow current digest loop to finish before setting VideoSize
        $timeout(bindSize, 0);
      }
    };
  };
  function offset() {
    return function(input, start) {
      start = parseInt(start, 10);
      return input.slice(start);
    };
  };

  // CONTROLLERS
  function GenericController($state) {
    var gc = this;
    gc.currentYear = new Date().getFullYear();
    gc.goTo = function(pagename) {
      $state.go(pagename);
    };
  };
  function HomeController($state, VideoSize, TechnologyDetails) {
    var hc = this;
    hc.dimensions = VideoSize.dimensions;
    hc.goToAbout = function() {
      $state.go('about');
    }
  };
  function FacultyController($modal) {
    var fmc = this;
    fmc.open = function (facultyMemberName) {
      var modalInstance = $modal.open({
        animation: true,
        templateUrl: 'Faculty Member Profiles/'+facultyMemberName+'.html',
        controller: 'GenericModalController as gmc',
        size: 'lg'
      });
    };
  };
  function TechnologiesController($scope, $state, $filter, $location, $anchorScroll, technologies, $sessionStorage, ResetSearch, _) {
    var tc = this;
    tc.freshPage = true;
    tc.techData = technologies;
    tc.pages = Math.ceil(tc.techData.technologies.length / 10);
    tc.possiblePages = _.range(tc.pages);
    tc.paginationLimits = {
      full: 7,
      upperHalf: 4,
      lowerHalf:3
    };
    tc.$storage = $sessionStorage.$default({
      searchText:'',
      categorySearch: {'Categories':' Show All'},
      currentPage: 0,
      relevantTech: tc.techData.technologies.slice(0)
    });
    if (ResetSearch.resetSearch) {
      ResetSearch.resetSearch = false;
      tc.$storage.searchText ='';
      tc.$storage.categorySearch = {'Categories':' Show All'};
      tc.$storage.currentPage = 0;
      tc.$storage.relevantTech = tc.techData.technologies.slice(0);
    }

    tc.scrollToTop = function(pageIndex) {
      if (tc.$storage.currentPage !== pageIndex) {
        $location.hash('top');
        $anchorScroll();  
      }
    };
    tc.goToTech = function(tech_id) {
      $state.go('technology',{'tech_id':tech_id});
    };
    tc.goTo = function(pagename) {
      $state.go(pagename);
    };

    function searchWatch(newVals, oldVals) {
      tc.$storage.relevantTech = $filter('filter')(tc.techData.technologies, newVals[0]);
      tc.$storage.relevantTech = $filter('filter')(tc.$storage.relevantTech, (newVals[1] === ' Show All' ? undefined : {'Categories':newVals[1]}));
      tc.pages = Math.ceil(tc.$storage.relevantTech.length / 10);
      tc.possiblePages = _.range(tc.pages);
      if (!tc.freshPage) {
        tc.$storage.currentPage = 0;
      }
      else {
        tc.freshPage = false;
      }
    };
    $scope.$watchCollection(function(){return [tc.$storage.searchText, tc.$storage.categorySearch.Categories]}, searchWatch);
  };
  function TechnologyController($state, $modal, $sessionStorage, technologies, technology) {
    var stc = this;
    stc.technologies = $sessionStorage.relevantTech || technologies.technologies;
    stc.selectedTech = technology;
    stc.techPos;
    stc.openOrIllShootGangsta = function (media) {
      var modalInstance = $modal.open({
          animation: true,
          template: media.type === 'video' ? 
                '<div fit-vids><iframe class="vid" src="'+media.link+'" frameborder="0" allowfullscreen></iframe></div>'
                : '<div><img class="img" src="'+media.link+'"></div>',
          size: 'lg'
      });
    };
    stc.nextTech = nextTech;
    stc.previousTech = previousTech;
    stc.contactAboutTech = function(tech_id) {
      $state.go('contact',{'tech_id':tech_id});
    };
    stc.goTo = function(pagename) {
      $state.go(pagename);
    };


    stc.techPos = 
      stc.technologies.map(function(item){return item.ID}).indexOf(stc.selectedTech.ID) === 0
      ? 'first'
      : ( stc.technologies.map(function(item){return item.ID}).indexOf(stc.selectedTech.ID) === stc.technologies.length-1
        ? 'last'
        : 'middle'
        );
    function nextTech(current_tech_id) {
      // Default to current technology if all else fails
      var new_tech_id = stc.selectedTech.ID;
      if (stc.technologies) {
        var current_index = stc.technologies.map(function(item){return item.ID}).indexOf(stc.selectedTech.ID);
        new_tech_id = stc.technologies[(current_index+1 === stc.technologies.length ? current_index : current_index+1)].ID;
      }
      $state.go('technology',{'tech_id': new_tech_id});
    };
    function previousTech(current_tech_id) {
      // Default to current technology if all else fails
      var new_tech_id = stc.selectedTech.ID;
      if (stc.technologies) {
        var current_index = stc.technologies.map(function(item){return item.ID}).indexOf(stc.selectedTech.ID);
        new_tech_id = stc.technologies[(current_index === 0 ? current_index : current_index-1)].ID;
      }
      $state.go('technology',{'tech_id': new_tech_id});
    };
  };
  function GenericModalController($modalInstance) {
    this.close = function () {
      $modalInstance.close();
    };
  };
  function ContactController($scope, $state, $stateParams, Emailer) {
    var cc = this;
    cc.formValid = false;
    cc.emailSent = false;
    cc.formData = {
      name:'',
      patent_id: $stateParams.tech_id,
      email:'',
      message:''
    };

    $scope.$watchCollection(
      function watchFormData() {
        return [cc.formData.name, cc.formData.email, cc.formData.message]
      },
      function handleFormDataChange() {
        if (cc.formData.name && emailRegex.test(cc.formData.email) && cc.formData.message) {
          cc.formValid = true;
        } else {
          cc.formValid = false;
        }
      }
    );

    cc.submitForm = function() {
      if (cc.formValid) {
        Emailer.SendContactEmail(cc.formData);
        cc.emailSent = true;
      }
    };

    cc.goTo = function(pagename) {
      $state.go(pagename);
    };
  };
  function HeaderController($scope,$state,$window) {
    $scope.windowWidth = $window.innerWidth;
    $scope.showMenu = false;
    // Watch for changes in the window width
    $(window).on("resize.doResize", function (){
      $scope.$apply(function(){
        $scope.showMenu = false;
        $scope.windowWidth = $window.innerWidth;
      });
    });
    $scope.$on("$destroy",function (){
      // Kill resize listener
       $(window).off("resize.doResize");
    });
    // -------------------------------------

    this.goTo = function(pagename) {
      $state.go(pagename);
      $scope.showMenu = false;
    }
  };

  // SERVICES
  function Emailer($http) {
    return {
      SendContactEmail: function(the_data) {
        return $http({
          method: 'POST',
          url: 'utils/send_email.php',
          headers: {
            'Content-Type':'application/json'
          },
          data: the_data
        });
      }
    }
  };
  function TechnologyDetails($http, $sce, $sessionStorage, _) {
    var techData = $sessionStorage.techData || {
      'technologies': null,
      'categories': null
    };

    var parseTechnologyFromGoogleSheets = function(tech_object) {
      return {
        'About the Market': tech_object.gsx$aboutthemarket.$t,
        'Categories': tech_object.gsx$categories.$t.split(','),
        'Contact Email': tech_object.gsx$contactemail.$t,
        'Contact Name': tech_object.gsx$contactname.$t,
        'Contact Phone': tech_object.gsx$contactphone.$t,
        'ID': tech_object.gsx$id.$t,
        'Media': [
          // {'link':$sce.trustAsResourceUrl(tech_object['gsx$media1'].$t), 'type':(tech_object['gsx$media1'].$t.indexOf('youtube.com') > -1 ? 'video' : (tech_object['gsx$media1'].$t.indexOf('vimeo.com') > -1 ? 'video' : (tech_object['gsx$media1'].$t ? 'photo' : undefined)))},
          // {'link':$sce.trustAsResourceUrl(tech_object['gsx$media2'].$t), 'type':(tech_object['gsx$media2'].$t.indexOf('youtube.com') > -1 ? 'video' : (tech_object['gsx$media2'].$t.indexOf('vimeo.com') > -1 ? 'video' : (tech_object['gsx$media2'].$t ? 'photo' : undefined)))},
          // {'link':$sce.trustAsResourceUrl(tech_object['gsx$media3'].$t), 'type':(tech_object['gsx$media3'].$t.indexOf('youtube.com') > -1 ? 'video' : (tech_object['gsx$media3'].$t.indexOf('vimeo.com') > -1 ? 'video' : (tech_object['gsx$media3'].$t ? 'photo' : undefined)))},
          // {'link':$sce.trustAsResourceUrl(tech_object['gsx$media4'].$t), 'type':(tech_object['gsx$media4'].$t.indexOf('youtube.com') > -1 ? 'video' : (tech_object['gsx$media4'].$t.indexOf('vimeo.com') > -1 ? 'video' : (tech_object['gsx$media4'].$t ? 'photo' : undefined)))}
          {'link':tech_object['gsx$media1'].$t, 'type':(tech_object['gsx$media1'].$t.indexOf('youtube.com') > -1 ? 'video' : (tech_object['gsx$media1'].$t.indexOf('vimeo.com') > -1 ? 'video' : (tech_object['gsx$media1'].$t ? 'photo' : undefined)))},
          {'link':tech_object['gsx$media2'].$t, 'type':(tech_object['gsx$media2'].$t.indexOf('youtube.com') > -1 ? 'video' : (tech_object['gsx$media2'].$t.indexOf('vimeo.com') > -1 ? 'video' : (tech_object['gsx$media2'].$t ? 'photo' : undefined)))},
          {'link':tech_object['gsx$media3'].$t, 'type':(tech_object['gsx$media3'].$t.indexOf('youtube.com') > -1 ? 'video' : (tech_object['gsx$media3'].$t.indexOf('vimeo.com') > -1 ? 'video' : (tech_object['gsx$media3'].$t ? 'photo' : undefined)))},
          {'link':tech_object['gsx$media4'].$t, 'type':(tech_object['gsx$media4'].$t.indexOf('youtube.com') > -1 ? 'video' : (tech_object['gsx$media4'].$t.indexOf('vimeo.com') > -1 ? 'video' : (tech_object['gsx$media4'].$t ? 'photo' : undefined)))}
        ],
        'Links': tech_object.gsx$links.$t.split(',').filter(function(item){return item != ''}),
        'Long Description': tech_object.gsx$longdescription.$t.split('\n\n'),
        'Name': tech_object.gsx$name.$t,
        'PI': tech_object.gsx$pi.$t,
        'Short Description': tech_object.gsx$shortdescription.$t,
        'Tags': tech_object.gsx$tags.$t.split(',')
      };
    };
    var getAllTechnologyData = function() {
      return $http.get('https://spreadsheets.google.com/feeds/list/1IZjNxRegAsMVW-4bZ87DeKKvoFeY4d3WcPYoxLiRxa4/1/public/values?alt=json-in-script&callback=jsonpCallback').then(function(data){
        var pre = data.data.replace('// API callback\njsonpCallback(','');
        var object = JSON.parse(pre.slice(0,pre.length - 2));
        var result = [];
        object.feed.entry.map(function(item){
          result.push(parseTechnologyFromGoogleSheets(item));
        });
        var categories = result.map(function(technology) {
          return technology.Categories.map(function(category) {
            return category.toProperCase().trim();
          });
        });
        categories = [' Show All'].concat(_.uniq([].concat.apply([],categories).filter(function(item){return !!item})));
        techData.technologies = result;
        techData.categories = categories;
        $sessionStorage.techData = techData;
        return techData;
      });
    };
    var getSingleTechnology = function(tech_id) {
      return (
        techData.technologies ? 
        techData.technologies.filter(function(item){return item.ID === tech_id})[0] : 
        getAllTechnologyData().then(function(the_techData) {
          return the_techData.technologies.filter(function(item){return item.ID === tech_id})[0]
        })
      );
    };
    var checkForTechnologyLoaded = function() {
      return ( techData.technologies ? techData : getAllTechnologyData() );
    };

    checkForTechnologyLoaded();
    return {
      'techData': techData,
      'getSingleTechnology': getSingleTechnology,
      'checkForTechnologyLoaded': checkForTechnologyLoaded
    };
  };
  function ResetSearch($sessionStorage) {
    var resetSearch = false;

    return {
      resetSearch: resetSearch
    };
  };
  function VideoSize() {
    var dimensions = {
      'width': null,
      'height': null
    };

    return {
      'dimensions': dimensions
    };
  };

  // RANDOM GLOBAL UTILITIES
  var emailRegex = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
  function scrollFix($rootScope, $document, $state) {
    $rootScope.$on('$stateChangeSuccess', function() {
      $document[0].body.scrollTop = $document[0].documentElement.scrollTop = 0;
    });
  };

  app
  .config(Config)
  .run(scrollFix)
  .directive('bindVideoSize', bindVideoSize)
  .filter('offset', offset)
  .controller('GenericController', GenericController)
  .controller('HomeController', HomeController)
  .controller('FacultyController', FacultyController)
  .controller('TechnologiesController', TechnologiesController)
  .controller('TechnologyController', TechnologyController)
  .controller('GenericModalController', GenericModalController)
  .controller('ContactController', ContactController)
  .controller('HeaderController', HeaderController)
  .factory('Emailer', Emailer)
  .factory('TechnologyDetails', TechnologyDetails)
  .factory('ResetSearch', ResetSearch)
  .factory('VideoSize',VideoSize)
  .factory('_',function() {
    return _;
  });
})(angular.module('rbatech',['ui.router','ui.bootstrap','ngAnimate','ngStorage']));