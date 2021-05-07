import { Utils } from "../../../../utils/utils";
import { GroupNetwork } from "../../../../network/common/groups/GroupNetwork";
import { PopupUtils } from "../../../../utils/PopupUtils";
import { AllGroups } from "../../../../collections/collection";


const axios = require('axios').default;

var limit= 0;
var apiCalling = false;
Template.groups_card_layout.onRendered(function(){
    Session.set("isReady",false);
    fetchAllGroups(limit);
    getURLChangeTracker();
});

function getURLChangeTracker(){
    Tracker.autorun(function() {
		FlowRouter.watchPathChange();
		var currentContext = FlowRouter.current();
		Session.set("activeURLType",currentContext.params.type);
        // fetchAllGroups(currentContext.params.type);
        AllGroups.remove({}); 
        console.log("Calling APi");
    });
}

function fetchAllGroups(limit){
    var obj =  {};
    obj.type = FlowRouter.current().params.type;
    obj.user_id = Utils.getLoggedInUserId();
    obj.query = FlowRouter.current().queryParams.query;
    
    obj.limit = limit;
    apiCalling = true;
    Session.set("active_cross_icon",FlowRouter.current().queryParams.query!=undefined);
    new GroupNetwork().fetchAllGroups(obj).then(function(data){
          apiCalling = false;
        if(data.data.code == 200){
            Session.set("isReady",true);
            for(var i=0;i<data.data.all_groups.length;i++){
                data.data.all_groups[i].type = obj.type; 
                AllGroups.insert(data.data.all_groups[i]);
            }
          Session.set("pagination_loading",false);
          Session.set("total_groups",data.data.total_groups);
          scrollToBottom()
        }
    }).catch(function(e){
        console.log(e);
        console.log('Something went wrong');
    })
}

function scrollToBottom(){
  window.onscroll = function() {
    var scrollHeight, totalHeight;
    scrollHeight = document.body.scrollHeight;
    totalHeight = window.scrollY + window.innerHeight;
    if(totalHeight >= scrollHeight)
    {
        if(limit<Session.get("total_groups")){
          if(apiCalling == false){
            limit  = limit + 8;
            Session.set("pagination_loading",true);
            fetchAllGroups(limit);
          }    
      }                  
    }
  }
}

Template.registerHelper('groups_count',function(){
        // var  query = new RegExp(FlowRouter.current().queryParams.query,'i');
        // return  AllGroups.find({type: FlowRouter.current().params.type,group_name:query}).count();
        return Session.get("total_groups");
})
Template.groups_card_layout.helpers({
    'fetch_groups_based_on_section':function(){
        //FlowRouter.current().params.type == Session.get("activeURL");
        return AllGroups.find({type: FlowRouter.current().params.type}).fetch();
    },check_type:function(){
        return Session.get("activeURLType");
    },logged_in_user_id:function(){
        return Utils.getLoggedInUserId();
    },isReady:function(){
        return Session.get("isReady");
    },pagination_loading:function(){
        return Session.get("pagination_loading");
    },active_cross_icon:function(){

        return Session.get("active_cross_icon");
    }
});



function configureLoader(id1,b){
  
  if(b){
    $(id1).removeClass("display_hidden");
  }else{
    $(id1).addClass("display_hidden");
  }
}

function removeGroup(b,group_id,loader_id){
  
  configureLoader(loader_id,true);
  var obj = {};
    obj.user_id = Utils.getLoggedInUserId();
    obj.group_id = group_id;
    axios.post(Utils.getUrl()+'remove_group',obj)
    .then(function (response) {
    // console.log(response.data);
    configureLoader(loader_id,false)
    if(response.data.code==200){
      $("#remove-modal").removeClass('is-active'); 
            AllGroups._collection.remove({group_id:group_id});
            Session.set("total_groups",Session.get("total_groups")-1); 
    }
    })
    .catch(function (error) {
    //   PopupUtils.showErrorPopupWithMessage("Internet connectivity Issue");
    });
}

Template.groups_card_layout.events({
  "click #confirm_remove":function(event){
    event.preventDefault();
   removeGroup(false,Session.get("removingGroupId"),"#remove_group_loader");
  },
 'click #delete_group':function(event){
    event.preventDefault();
    Session.set("removingGroupId",this.group_id);
    $("#group_name_headline").text("Remove "+ this.group_name+"?");
    $("#remove-modal").addClass('is-active');
  },
  "click .close-modal":function(event){
        event.preventDefault();
    $("#remove-modal").removeClass("is-active");
  },

    "click #report_abuse_trigger":function(event){
    event.preventDefault();
    $("#report_abuse-modal").addClass("is-active")
    Session.set("reportedFeedPostId", this.group_id);
    Session.set("reportedPostType",'group');
    },
    "click  .start_discussion":function(event){
        event.preventDefault();
          let id = Utils.encodeString(this.group_id);
         window.location.href="/discussion-listing/"+id;
   },
   "click .edit_group":function(event){
        event.preventDefault();
        let id = Utils.encodeString(this.group_id);
        window.location.href="/edit-group/"+id;

   },
    "click .group_detail":function(event){
        event.preventDefault();
        let id = this.group_id;
       let eId = Utils.encodeString(id);
        window.location.href="/group-detail/"+eId;
   },"click .accept_invite_button":function(){
       var obj = {};
        obj.user_id = Utils.getLoggedInUserId();
        obj.group_id = this.group_id ;
        obj.created_by = this.created_by;
        obj.status = 1;
        changeStatus(obj);
   },"click .reject_invite_button":function(){
        var obj = {};
        obj.user_id = Utils.getLoggedInUserId();
        obj.group_id = this.group_id;
        obj.created_by = this.created_by;
        obj.status = 2;
        changeStatus(obj);
   }
})

function changeStatus(obj){
    new GroupNetwork().changeInviteStatus(obj)
    .then(function (response) {
        console.log(response);
     if(response.data.code==200){
             if(obj.status == 1){         
               let eId = Utils.encodeString(obj.group_id);
                window.location.href="/discussion-listing/"+eId;
             }else{
                AllGroups.remove({group_id:obj.group_id});
                  fetchTotalCount()
             }

       }else{
           PopupUtils.showErrorPopupWithMessage(response.data.message);
       }
    })
    .catch(function (error) {
        console.log(error);
      PopupUtils.showErrorPopupWithMessage("Internet connectivity Issue");
    });
}

function fetchTotalCount(){
    var obj =  {};
    obj.user_id = Utils.getLoggedInUserId();
    obj.query = FlowRouter.current().queryParams.query;
    new GroupNetwork().fetchAllGroupsCount(obj).then(function(data){
        $("#all_groups").text("All (" + data.data.all_groups + ")");
        $("#all_groups_").text("All (" + data.data.all_groups + ")");
        $("#pending_groups").text("Pending (" + data.data.all_pending + ")");
        $("#pending_groups_").text("Pending (" + data.data.all_pending + ")");
        $("#created_by_me_group").text("Created by me (" + data.data.all_created_by_me + ")");
        $("#created_by_me_group_").text("Created by me (" + data.data.all_created_by_me + ")");
        Session.set("total_groups",parseInt(Session.get("total_groups"))-1);
    }).catch(function(e){
        console.log(e);
        console.log('Something went wrong');
    })
}