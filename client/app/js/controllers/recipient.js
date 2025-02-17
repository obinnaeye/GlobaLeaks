GL.controller("ReceiverTipsCtrl", ["$scope",  "$filter", "$http", "$location", "$uibModal", "$window", "RTipExport", "TokenResource",
  function($scope, $filter, $http, $location, $uibModal, $window, RTipExport, TokenResource) {

  $scope.search = undefined;
  $scope.currentPage = 1;
  $scope.itemsPerPage = 20;
  $scope.dropdownSettings = {dynamicTitle: false, showCheckAll: false, showUncheckAll: false, enableSearch: true, displayProp: "label", idProp: "label", itemsShowLimit: 5};

  $scope.reportDateFilter = null;
  $scope.updateDateFilter = null;
  $scope.expiryDateFilter = null;

  $scope.dropdownStatusModel = [];
  $scope.dropdownStatusData = [];
  $scope.dropdownContextModel = [];
  $scope.dropdownContextData = [];
  $scope.dropdownScoreModel = [];
  $scope.dropdownScoreData = [];

  var unique_keys = [];
  angular.forEach($scope.resources.rtips, function(tip) {
     tip.context = $scope.contexts_by_id[tip.context_id];
     tip.context_name = tip.context.name;
     tip.submissionStatusStr = $scope.Utils.getSubmissionStatusText(tip.status, tip.substatus, $scope.submission_statuses);

     if (unique_keys.includes(tip.submissionStatusStr) === false) {
       unique_keys.push(tip.submissionStatusStr);
       $scope.dropdownStatusData.push({id: $scope.dropdownStatusData.length + 1, label: tip.submissionStatusStr});
     }

     if (unique_keys.includes(tip.context_name) === false) {
       unique_keys.push(tip.context_name);
       $scope.dropdownContextData.push({id: $scope.dropdownContextData.length + 1, label: tip.context_name});
     }

     var scoreLabel = $scope.Utils.maskScore(tip.score);

     if (unique_keys.includes(scoreLabel) === false) {
       unique_keys.push(scoreLabel);
       $scope.dropdownScoreData.push({id: $scope.dropdownScoreData.length + 1, label: scoreLabel});
     }
  });

  $scope.filteredTips = $filter("orderBy")($scope.resources.rtips, "update_date");

  $scope.dropdownDefaultText = {
    buttonDefaultText: "",
    searchPlaceholder: $filter("translate")("Search")
  };

  function applyFilter()
  {
     $scope.filteredTips = $scope.Utils.getStaticFilter($scope.resources.rtips, $scope.dropdownStatusModel, "submissionStatusStr");
     $scope.filteredTips = $scope.Utils.getStaticFilter($scope.filteredTips, $scope.dropdownContextModel, "context_name");
     $scope.filteredTips = $scope.Utils.getStaticFilter($scope.filteredTips, $scope.dropdownScoreModel, "score");
     $scope.filteredTips = $scope.Utils.getDateFilter($scope.filteredTips, $scope.reportDateFilter, $scope.updateDateFilter, $scope.expiryDateFilter);
  }

  $scope.on_changed = {
    onSelectionChanged: function() {
      applyFilter();
    }
  };

  $scope.onReportFilterChange = function(reportFilter) {
    $scope.reportDateFilter = reportFilter;
    applyFilter();
  };

  $scope.onUpdateFilterChange = function(updateFilter) {
    $scope.updateDateFilter = updateFilter;
    applyFilter();
  };

  $scope.onExpiryFilterChange = function(expiryFilter) {
    $scope.expiryDateFilter = expiryFilter;
    applyFilter();
  };

  $scope.checkFilter = function(filter) {
    return filter.length > 0;
  };

  $scope.$watch("search", function (value) {
    if (typeof value !== "undefined") {
      $scope.currentPage = 1;
      $scope.filteredTips = $filter("orderBy")($filter("filter")($scope.resources.rtips, value), "update_date");
    }
  });

  $scope.open_grant_access_modal = function () {
    return $scope.Utils.runUserOperation("get_users_names").then(function(response) {
      var selectable_recipients = [];

      $scope.public.receivers.forEach(async (receiver) => {
        if (receiver.id !== $scope.Authentication.session.user_id) {
          selectable_recipients.push(receiver);
        }
      });

      $uibModal.open({
      templateUrl: "views/modals/grant_access.html",
        controller: "ConfirmableModalCtrl",
        resolve: {
          arg: {
            users_names: response.data,
            selectable_recipients: selectable_recipients
          },
          confirmFun: function() {
            return function(receiver_id) {
              var args = {
                rtips: $scope.selected_tips,
                receiver: receiver_id
              };

              return $scope.Utils.runRecipientOperation("grant", args, true);
            };
          },
          cancelFun: null
        }
      });
    });
  };

  $scope.open_revoke_access_modal = function () {
    return $scope.Utils.runUserOperation("get_users_names").then(function(response) {
      var selectable_recipients = [];

      $scope.public.receivers.forEach(async (receiver) => {
        if (receiver.id !== $scope.Authentication.session.user_id) {
          selectable_recipients.push(receiver);
        }
      });

      $uibModal.open({
      templateUrl: "views/modals/revoke_access.html",
        controller: "ConfirmableModalCtrl",
        resolve: {
          arg: {
            users_names: response.data,
            selectable_recipients: selectable_recipients
          },
          confirmFun: function() {
            return function(receiver_id) {
              var args = {
                rtips: $scope.selected_tips,
                receiver: receiver_id
              };

              return $scope.Utils.runRecipientOperation("revoke", args, true);
            };
          },
          cancelFun: null
        }
      });
    });
  };

  $scope.exportTip = RTipExport;

  $scope.selected_tips = [];

  $scope.select_all = function () {
    $scope.selected_tips = [];
    angular.forEach($scope.filteredTips, function (tip) {
      if (tip.accessible) {
        $scope.selected_tips.push(tip.id);
      }
    });
  };

  $scope.toggle_star = function(tip) {
    return $http({
      method: "PUT",
      url: "api/recipient/rtips/" + tip.id,
      data: {
        "operation": "set",
        "args": {
          "key": "important",
          "value": !tip.important
        }
      }
    }).then(function() {
      tip.important = !tip.important;
    });
  };

  $scope.deselect_all = function () {
    $scope.selected_tips = [];
  };

  $scope.tip_switch = function (id) {
    var index = $scope.selected_tips.indexOf(id);
    if (index > -1) {
      $scope.selected_tips.splice(index, 1);
    } else {
      $scope.selected_tips.push(id);
    }
  };

  $scope.isSelected = function (id) {
    return $scope.selected_tips.indexOf(id) !== -1;
  };

  $scope.markReportStatus = function (date) {
    var report_date = new Date(date);
    var current_date = new Date();
    return current_date > report_date;
  };

  $scope.tips_export = function () {
    for(var i=0; i<$scope.selected_tips.length; i++) {
      (function(i) {
        new TokenResource().$get().then(function(token) {
          return $window.open("api/recipient/rtips/" + $scope.selected_tips[i] + "/export?token=" + token.id + ":" + token.answer);
        });
      })(i);
    }
  };

  $scope.getDataCsv = function(){
    var output = angular.copy($scope.filteredTips);
    return output.map(function(tip){
      return {
        id:tip.id,
        progressive: tip.progressive,
        important: tip.important,
        reportStatus: $scope.markReportStatus(tip.reminder_date),
        context_name: tip.context_name,
        label:tip.label,
        status: tip.submissionStatusStr,
        creation_date: $filter("date")(tip.creation_date, "dd-MM-yyyy HH:mm"),
        update_date: $filter("date")(tip.update_date, "dd-MM-yyyy HH:mm"),
        expiration_date: $filter("date")(tip.expiration_date, "dd-MM-yyyy HH:mm"),
        last_access: $filter("date")(tip.last_access, "dd-MM-yyyy HH:mm"),
        comment_count: tip.comment_count,
        file_count: tip.file_count,
        subscription: tip.subscription === 0 ? "Non sottoscritta" : tip.subscription === 1 ? "Sottoscritta" : "Sottoscritta successivamente",
        receiver_count: tip.receiver_count
      };
    });
  };

  $scope.getDataCsvHeaders = function (){
    return ["Id",
            "Sequential",
            "Important",
            "Reminder",
            "Channel",
            "Label",
            "Report Status",
            "Date of Report",
            "Last Update",
            "Expiration date",
            "Last Access",
            "Number of Comments",
            "Number of Files",
            "Subscription",
            "Number of Recipients"].map($filter("translate"));
  };

  $scope.actAsWhistleblower = function () {
    $http.get("/api/auth/operatorauthswitch").then(function (result) {
      if (result.status === 200) {
        var urlRedirect = window.location.origin + result.data.redirect;
        window.open(urlRedirect, "_blank");
      }
    });
  };
}]);
