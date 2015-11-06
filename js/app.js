// GLOBALS
window.jsonpCallback = function () { return true; };
String.prototype.toProperCase = function () {
  return this.replace(/\b\w+/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

(function(app){
  // ROUTES
  function Routes($stateProvider, $urlRouterProvider) {
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
            technology: function($stateParams, TechnologyDetails) {
              return TechnologyDetails.getSingleTechnology($stateParams.tech_id);
            }
          }
        })

      .state('resources', {
        url: '/resources',
        templateUrl: 'templates/resources.html',
        controller: 'GenericController as rc'
      });
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
  function HomeController($state, VideoSize) {
    var hc = this;
    hc.dimensions = VideoSize.dimensions;
    hc.goToAbout = function() {
      $state.go('about');
    }
  };
  function TechnologiesController($scope, $state, $filter, technologies) {
    var tc = this;
    tc.techData = technologies;
    tc.relevantTech = tc.techData.technologies.slice(0);
    tc.pages = Math.ceil(tc.techData.technologies.length / 10);
    tc.currentPage = 0;
    tc.searchText = '';
    tc.categorySearch = {'Categories':'Show All'};
    tc.goToTech = function(tech_id) {
      $state.go('technology',{'tech_id':tech_id});
    };
    tc.goTo = function(pagename) {
      $state.go(pagename);
    };

    function searchWatch(newVals, oldVals) {
      tc.relevantTech = $filter('filter')(tc.techData.technologies, newVals[0]);
      tc.relevantTech = $filter('filter')(tc.relevantTech, (newVals[1] === 'Show All' ? undefined : {'Categories':newVals[1]}));
      tc.pages = Math.ceil(tc.relevantTech.length / 10);
      tc.currentPage = 0;
    };
    $scope.$watchCollection(function(){return [tc.searchText, tc.categorySearch.Categories]}, searchWatch);
  };
  function TechnologyController($state, $modal, technology) {
    var stc = this;
    stc.selectedTech = technology;
    stc.openOrIllShootGangsta = function (media) {
      var modalInstance = $modal.open({
          animation: true,
          template: media.type === 'video' ? 
                '<div fit-vids><iframe class="vid" src="'+media.link+'" frameborder="0" allowfullscreen></iframe></div>'
                : '<div><img class="img" src="'+media.link+'"></div>',
          controller: 'TechnologyPictureModalController as tpmc',
          size: 'lg'
      });
    };
    stc.contactAboutTech = function(tech_id) {
      $state.go('contact',{'tech_id':tech_id});
    };
    stc.goTo = function(pagename) {
      $state.go(pagename);
    };
  };
  function TechnologyPictureModalController($modalInstance) {
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
  function TechnologyDetails($http, $sce, _) {
    var techData = {
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
          {'link':$sce.trustAsResourceUrl(tech_object['gsx$media1'].$t), 'type':(tech_object['gsx$media1'].$t.indexOf('youtube.com') > -1 ? 'video' : (tech_object['gsx$media1'].$t.indexOf('vimeo.com') > -1 ? 'video' : (tech_object['gsx$media1'].$t ? 'photo' : undefined)))},
          {'link':$sce.trustAsResourceUrl(tech_object['gsx$media2'].$t), 'type':(tech_object['gsx$media2'].$t.indexOf('youtube.com') > -1 ? 'video' : (tech_object['gsx$media2'].$t.indexOf('vimeo.com') > -1 ? 'video' : (tech_object['gsx$media2'].$t ? 'photo' : undefined)))},
          {'link':$sce.trustAsResourceUrl(tech_object['gsx$media3'].$t), 'type':(tech_object['gsx$media3'].$t.indexOf('youtube.com') > -1 ? 'video' : (tech_object['gsx$media3'].$t.indexOf('vimeo.com') > -1 ? 'video' : (tech_object['gsx$media3'].$t ? 'photo' : undefined)))},
          {'link':$sce.trustAsResourceUrl(tech_object['gsx$media4'].$t), 'type':(tech_object['gsx$media4'].$t.indexOf('youtube.com') > -1 ? 'video' : (tech_object['gsx$media4'].$t.indexOf('vimeo.com') > -1 ? 'video' : (tech_object['gsx$media4'].$t ? 'photo' : undefined)))}
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
      return $http.get('https://spreadsheets.google.com/feeds/list/17Tf9_PvDC-fx3-vTHkmopjAndc94ZTXWFp-q0jxJjrM/1/public/values?alt=json-in-script&callback=jsonpCallback').then(function(data){
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
        categories = ['Show All'].concat(_.uniq([].concat.apply([],categories).filter(function(item){return !!item})));
        techData.technologies = result;
        techData.categories = categories;
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
      return (techData.technologies ? techData : getAllTechnologyData() );
    };

    return {
      'techData': techData,
      'getSingleTechnology': getSingleTechnology,
      'checkForTechnologyLoaded': checkForTechnologyLoaded
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
  function DataTransfer($http) {
    return {
      SendContactEmail: function(the_data) {
        return $http({
          method: 'POST',
          url: 'https://mandrillapp.com/api/1.0/messages/send.json',
          headers: {
            'Content-Type':'application/json'
          },
          data: {
            "key":"h_FdIHNlZN0YdLY8vU8Cfg",
            "message": {
              "text": 'Name: '+the_data.name+'\nEmail Address: '+the_data.email+'\nPhone Number: '+the_data.phone+'\nMessage: '+the_data.message,
              "subject": "You have a new message for the RBA site.",
              "from_email": "signupforroyalbusinessacademy@gmail.com",
              "from_name": "New Message from RBA site",
              "to": [
                {
                  "email": "spencer@royalbusinessacademy.org ",
                  "name": "Spencer Rogers",
                  "type": "to"
                }
              ]
            }
          }
        });
      },
      SendApplicationEmail: function() {
        return $http({
          method: 'POST',
          url: 'https://mandrillapp.com/api/1.0/messages/send.json',
          headers: {
            'Content-Type':'application/json'
          },
          data: {
            "key":"h_FdIHNlZN0YdLY8vU8Cfg",
            "message": {
              "text": 'You just had a new student apply for Royal Business Academy!',
              "subject": "New RBA Applicant",
              "from_email": "signupforroyalbusinessacademy@gmail.com",
              "from_name": "New Message from RBA site",
              "to": [
                {
                  "email": "spencer@royalbusinessacademy.org ",
                  "name": "Spencer Rogers",
                  "type": "to"
                }
              ]
            }
          }
        });
      },
      SendApplication: function(the_data) {
        return $http({
          method: 'POST',
          url: 'https://docs.google.com/forms/d/1hn7YvTiMZZhA3FEm7-UHagXZDvifUx5VbLdRgz37_nE/formResponse',
          headers: {
            'Content-Type':'application/x-www-form-urlencoded'
          },
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          },
          data: {
            'entry.1837275675': the_data.first_name || '',
            'entry.2057115759': the_data.preferred_name || '',
            'entry.1691304936': the_data.native_language || '',
            'entry.961943981': the_data.other_languages || '',
            'entry.765568650': the_data.family_surname || '',
            'entry.1496721659': the_data.date_of_birth || '',
            'entry.1058894701': the_data.how_did_you_hear_about_us || '',
            'entry.1267007426': the_data.gender || '',
            'entry.1248163241': the_data.street_address || '',
            'entry.1538648643': the_data.state_province || '',
            'entry.326672777': the_data.postal_code || '',
            'entry.757327993': the_data.telephone_number || '',
            'entry.716204733': the_data.city || '',
            'entry.753284705': the_data.country || '',
            'entry.344209816': the_data.email || '',
            'entry.629576774': the_data.application_year || '',
            'entry.809888668': the_data.level_of_education || ''
          }
        });
      }
    }
  };

  // RANDOM GLOBAL UTILITIES
  var emailRegex = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
  function scrollFix($rootScope, $document, $state) {
    $rootScope.$on('$stateChangeSuccess', function() {
      $document[0].body.scrollTop = $document[0].documentElement.scrollTop = 0;
    });
  };

  app
  .config(Routes)
  .run(scrollFix)
  .directive('bindVideoSize', bindVideoSize)
  .filter('offset', offset)
  .controller('GenericController', GenericController)
  .controller('HomeController', HomeController)
  .controller('TechnologiesController', TechnologiesController)
  .controller('TechnologyController', TechnologyController)
  .controller('TechnologyPictureModalController', TechnologyPictureModalController)
  .controller('ContactController', ContactController)
  .controller('HeaderController', HeaderController)
  .factory('TechnologyDetails', TechnologyDetails)
  .factory('VideoSize',VideoSize)
  .factory('_',function() {
    return _;
  });
})(angular.module('rbatech',['ui.router','ui.bootstrap','ngAnimate']));