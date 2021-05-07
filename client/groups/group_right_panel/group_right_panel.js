import { PopupUtils } from '../../../../utils/PopupUtils';
import { Utils } from '../../../../utils/utils';
import { FeedOperations } from '../../../../utils/FeedOperations';

import {GroupMember} from './../../../../collections/collection';
import { Base64 } from 'meteor/ostrio:base64';
import { HTTP } from 'meteor/http';
const axios = require('axios').default;

import { User } from '../../../../collections/collection';
import { GroupNetwork } from '../../../../network/common/groups/GroupNetwork';
import { GroupUtils } from '../GroupUtils';
import { TotalMembers,GroupDetails } from '../GroupUtils';



Template.group_right_panel.onRendered(function(){  
  let gId = Base64.decode(FlowRouter.current().params.groupId);
  checkIfMemberOfGroup(gId);
  fetchGroupDetailsBasedOnId();
})

 function checkIfMemberOfGroup(gId){
      var obj = {};
        obj.user_id = localStorage.getItem("_id");
        obj.group_id = gId ;
        axios.post(Utils.getUrl()+'check_if_user_is_member_of_group',obj)
        .then(function (response) {
         if(response.data.code==200){
           if(response.data.is_member){
             Session.set("user_is_part_of_the_group",true);
             $("#group_member_or_not").removeClass("display_hidden");
             $("#chnage_text").text("Start Discussion").button("refresh");
           }else{
             Session.set("user_is_part_of_the_group",false);
              $("#chnage_text").text("Join Group").button("refresh");
            }
         }
        })
        .catch(function (error) {
        });
 }
 function fetchGroupDetailsBasedOnId(){
    var obj = {};
    obj.user_id = Utils.getLoggedInUserId();
    obj.group_id = Utils.decodedEncodedString(FlowRouter.current().params.groupId);
    obj.coming_from_edit_group = false;
    new GroupUtils().fetchGroupDetails(obj);
    
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
    if(isLeaving == false){
      TotalMembers._collection.remove({user_id:user_id});
    }else{
      PopupUtils.showSuccessPopup(" Removed Successfully");
      window.location.href = "/groups/all";
    }
      
    }
    })
    .catch(function (error) {
    //   PopupUtils.showErrorPopupWithMessage("Internet connectivity Issue");
    });
}

Template.group_right_panel.events({
  "click #redirect_to_discussions":function(event){
    event.preventDefault();
     window.location.href="/discussion-listing/"+FlowRouter.current().params.groupId;
  },
  "click #view_modals":function(event){
    event.preventDefault();
    $("#total-members").addClass("is-active");
  },"click #invite_members_modal":function(event){
    event.preventDefault();
    $("#invite-members").addClass("is-active");
  },
    "click .modal-background":function(event){
     event.preventDefault();
    $("#total-members").removeClass("is-active");
    $("#invite-members").removeClass("is-active");
  },
    "click .close-wrap":function(event){
    event.preventDefault();
    $("#total-members").removeClass("is-active");
    $("#invite-members").removeClass("is-active");
  },
  "click #remove_user_from_group":function(event){
    event.preventDefault();
     var group_id =  Base64.decode(FlowRouter.current().params.groupId);
    leaveGroup(false,group_id,"#loader",this.user_id,false);
  },
  // "change #group_member_or_not":function(event){
  //   event.preventDefault();
  //   $("#leave_group").addClass("is-active");
  // },
  // "click .withdraw_confirmed":function(event){
  //   event.preventDefault();
  //   var group_id =  Base64.decode(FlowRouter.current().params.groupId);
  //   leaveGroup(false,group_id,"#loader",Utils.getLoggedInUserId(),true);
  // },
   "click .close-modal":function(event){
        event.preventDefault();
    $("#withdraw-modal").removeClass('is-active');
   $("#member_status").val("member");
  },   "click .modal-background":function(event){
        event.preventDefault();
    $("#withdraw-modal").removeClass('is-active');
   $("#member_status").val("member");
  },

  "click #chnage_text": function (event) {
    event.preventDefault();
 
    if ($("#chnage_text").text().trim() == "Join Group") {
      var obj = {};
      // obj.loginUserId = localStorage.getItem("_id");
      // obj.group_id = this.group_id;
      
      var groupDetails  = GroupDetails.find({group_id: Utils.decodedEncodedString(FlowRouter.current().params.groupId)}).fetch();
        if(groupDetails.length>0){
      obj.user_id = Utils.getLoggedInUserId();
        obj.group_id = groupDetails[0].group_id ;
        obj.created_by = groupDetails[0].created_by;
        obj.status = 1;
      axios.post(Utils.getUrl() + 'changeInviteStatus', obj)
        .then(function (response) {
          console.log("response", response.data);
          if (response.data.code == 200) {
            location.reload();

            if (response.data.is_member) {
              PopupUtils.showSuccessPopup(response.data.message);
              $("#chnage_text").text("Start Discussion").button("refresh");
            } else {
              PopupUtils.showSuccessPopup(response.data.message);
              $("#chnage_text").text("Join Group").button("refresh");
              // $("#chnage_text").html("Join Group");
            }
          } else if (response.data.code == 300) {
            PopupUtils.showErrorPopupWithMessage("Can't join, you are not invited");
          }
        })
        .catch(function (error) {
          //   PopupUtils.showErrorPopupWithMessage("Internet connectivity Issue");
        });
        }
    } else if ($("#chnage_text").text().trim() == "Start Discussion") {
       let groupId = FlowRouter.current().params.groupId;;
      window.location.href = "/discussion-listing/" + groupId;
    }

  },
  "click #read_more":function(event){
    event.preventDefault();
    let id = this.group_id;
   let eId = Base64.encode(id);
    window.location.href="/group-detail/"+eId;
},
  "click .invite_mem":function(){
          var array = []
      var checkboxes = document.querySelectorAll('input[type=checkbox]:checked')
      for (var i = 0; i < checkboxes.length; i++) {
        array.push(checkboxes[i].value)
      }
       console.log("ids",array);
      if(array.length==0){
        alert("Plese select at least one member to invite");
      }else{
            var obj = {};
            obj.invited_users = array;
            obj.group_id =  Base64.decode(FlowRouter.current().params.groupId);
            obj.user_id = Utils.getLoggedInUserId();

              console.log("obj",obj);
            axios.post(Utils.getUrl()+'inviteSentForJoinGroup',obj)
            .then(function (response) {
              console.log(response);
             if(response.data.code==200){
               if(response.data.is_member){
                 PopupUtils.showSuccessPopup(response.data.message);
                 location.reload();
               }else{
                   PopupUtils.showErrorPopupWithMessage(response.data.message);
               }
             }else if(response.data.code == 700){
                PopupUtils.showErrorPopupWithMessage(response.data.message);
             }
            })
            .catch(function (error) {
            //   PopupUtils.showErrorPopupWithMessage("Internet connectivity Issue");
            });
      }

  },
 
})