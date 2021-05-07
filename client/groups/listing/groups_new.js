import { Utils } from "../../../../utils/utils";
import { GroupNetwork } from "../../../../network/common/groups/GroupNetwork";
import { PopupUtils } from "../../../../utils/PopupUtils";
import { AllGroups } from "../../../../collections/collection";

Template.groups_new.helpers({
    'fetch_groups_based_on_section':function(){
        return [];
    }, 
    'check_if_active_url':function(type){
        return Session.get("activeURLType") == type;
    },active_cross_icon:function(){
        return Session.get("active_cross_icon");
    },search_query:function(){
        return FlowRouter.current().queryParams.query;
    }
});

Template.groups_new.onRendered(function(){
      fetchTotalCount();
})
function fetchTotalCount(){
    var obj =  {};
    obj.user_id = Utils.getLoggedInUserId();
    obj.query = FlowRouter.current().queryParams.query;
    Session.set("isReady",false);
    if(obj.query == undefined){
          Session.set("active_cross_icon",false);
    }else if(obj.query!=undefined && obj.query.length == 0){
          Session.set("active_cross_icon",false);
      }else{
          Session.set("active_cross_icon",true);
      }
    new GroupNetwork().fetchAllGroupsCount(obj).then(function(data){
        $(".all_groups").text("All (" + data.data.all_groups + ")");
        $(".all_groups_").text("All (" + data.data.all_groups + ")");
        $(".pending_groups").text("Pending (" + data.data.all_pending + ")");
        $(".pending_groups_").text("Pending (" + data.data.all_pending + ")");
        $(".created_by_me_group").text("By me (" + data.data.all_created_by_me + ")");
        $(".created_by_me_group_").text("By me (" + data.data.all_created_by_me + ")");
    }).catch(function(e){
        console.log(e);
        console.log('Something went wrong');
    })
}
Template.groups_new.events({
    "click .create_group":function(event){
        event.preventDefault();
        window.location.href = "/create-group";
    },
    "click .all_tab":function(event){
        event.preventDefault();
        if($("#search_query").val() == ""){
            window.location.href = "/groups/all";    
        }else{
            window.location.href = "/groups/all"  + "?query="  + $("#search_query").val();;
        }
        
    },
    "click .pending_tab":function(event){
        event.preventDefault();
         if($("#search_query").val() == ""){
            window.location.href = "/groups/pending";    
        }else{
            window.location.href = "/groups/pending"  + "?query="  + $("#search_query").val();;
        }
    },"click .created_by_me":function(event){
        event.preventDefault();
        if($("#search_query").val() == ""){
            window.location.href = "/groups/by_me";    
        }else{
            window.location.href = "/groups/by_me"  + "?query="  + $("#search_query").val();;
        }
        // window.location.href = "/groups/";
    },
    "keyup #search_query":function(event){
        event.preventDefault();
        if($("#search_query").val().length == 0){
           Session.set("active_cross_icon",false);
       }else{
           Session.set("active_cross_icon",true);
       }
      if (event.which === 13 || event.keyCode === 13 || event.key === "Enter")
       {
            window.location.href = "/groups/"+ FlowRouter.current().params.type + "?query="  + $("#search_query").val();
       }
    },
    "click .error-icon":function(event){
        event.preventDefault();
        $("#search_query").val("");
        window.location.href = "/groups/"+ FlowRouter.current().params.type ;
    },
})