import {
	Utils
} from '../../../../utils/utils';
import {
	Base64
} from 'meteor/ostrio:base64';
const axios = require('axios').default;
import { TotalMembers,GroupDetails } from '../GroupUtils';

Template.group_detail.onRendered(function(){
 let gId = Base64.decode(FlowRouter.current().params.groupId);
  checkIfMemberOfGroup(gId);
})
 function checkIfMemberOfGroup(gId){
      var obj = {};
        obj.user_id = localStorage.getItem("_id");
        obj.group_id = gId ;
        axios.post(Utils.getUrl()+'check_if_user_is_member_of_group',obj)
        .then(function (response) {
         if(response.data.code==200){
           if(response.data.is_member){
             $("#member_status").text("Joined");
           }
         }
        })
        .catch(function (error) {
        });
 }

function configureLoader(id1,b){
  
  if(b){
    $(id1).removeClass("display_hidden");
  }else{
    $(id1).addClass("display_hidden");
  }
}

function leaveGroup(b,group_id,loader_id,user_id,isLeaving){
  
  configureLoader(loader_id,true)
  var obj = {};
    obj.user_id = user_id
    obj.group_id = group_id;
    axios.post(Utils.getUrl()+'leave_group',obj)
    .then(function (response) {
    console.log(response);
    configureLoader(loader_id,false)
    if(response.data.code==200){
      
    $("#leave_group").removeClass('is-active'); 
      window.location.href = "/groups/all";
      PopupUtils.showSuccessPopup(" Removed Successfully");
      
    }
    })
    .catch(function (error) {
    //   PopupUtils.showErrorPopupWithMessage("Internet connectivity Issue");
    });
}

function removeGroup(b,group_id,loader_id){
  
  configureLoader(loader_id,true);
  var obj = {};
    obj.user_id = Utils.getLoggedInUserId();
    obj.group_id = group_id;
    axios.post(Utils.getUrl()+'remove_group',obj)
    .then(function (response) {
    configureLoader(loader_id,false)
    if(response.data.code==200){
      		$("#remove-modal").removeClass('is-active'); 
            window.location.href ="/groups/all"
    }
    })
    .catch(function (error) {
    //   PopupUtils.showErrorPopupWithMessage("Internet connectivity Issue");
    });
}

Template.group_detail.events({
	"click #leave_group_trigger":function(event){
    event.preventDefault();
    $("#leave_group").addClass("is-active");
  },
  "click .withdraw_confirmed":function(event){
    event.preventDefault();
    var group_id =  Base64.decode(FlowRouter.current().params.groupId);
    leaveGroup(false,group_id,"#loader",Utils.getLoggedInUserId(),false);
  },

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

	"click #three_dots":function(event){
		event.preventDefault();
    if(!$("#three_dots").hasClass("is-active")){
      $("#three_dots").addClass("is-active");
    }else{
		  $("#three_dots").removeClass("is-active");
    }
	},
	 "click #report_abuse_trigger":function(event){
	    event.preventDefault();
	    $("#report_abuse-modal").addClass("is-active");
	     let groupId = FlowRouter.current().params.groupId;
		 let gId = Base64.decode(groupId);
	    Session.set("reportedFeedPostId", gId);
	    Session.set("reportedPostType",'group');
    },
	"click #create_gp": function () {
		window.location.href = "/create-group";
	},
	"click .edit_group": function (event) {
		event.preventDefault();
		let id = Base64.encode(this.group_id);
		window.location.href = "/edit-group/" + id;

	},
	"click .redirect_to_profile":function(event){
		event.preventDefault();
		Utils.openUserProfile(this.user_type,this.user_id,true,this.name);
	},
	  "click .modal-background":function(event){
     event.preventDefault();
    $("#total-members").removeClass("is-active");
    $("#invite-members").removeClass("is-active");
    $("#leave_group").removeClass("is-active");
    $("#remove-modal").removeClass('is-active');
  }, "click .close-modal":function(event){
     event.preventDefault();
    $("#total-members").removeClass("is-active");
    $("#invite-members").removeClass("is-active");
    $("#leave_group").removeClass("is-active");
    $("#remove-modal").removeClass('is-active');
  },
})