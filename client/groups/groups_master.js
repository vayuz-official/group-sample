import { PopupUtils } from '../../../utils/PopupUtils';
import { Utils } from '../../../utils/utils';
import { FeedOperations } from '../../../utils/FeedOperations';

import {DiscussionLikes,FeedLikes, GroupMember} from './../../../collections/collection';
import { Base64 } from 'meteor/ostrio:base64';
import { HTTP } from 'meteor/http';
const axios = require('axios').default;

import { User } from '../../../collections/collection';
import { GroupNetwork } from '../../../network/common/groups/GroupNetwork';

import {TotalMembers,GroupDetails,NewInvitees,AlreadyInvited } from './GroupUtils';

Template.registerHelper("fetch_all_people_who_liked",function(){
    var a =  DiscussionLikes.find({}).fetch();
    if(a.length == 0){
        return FeedLikes.find({}).fetch();
    }else{
        return a;
    }
})
Template.registerHelper('fetch_group_based_on_group_id',function(){
    let groupId = FlowRouter.current().params.groupId;
    let gId = Base64.decode(groupId);
    var allComments =  GroupDetails.find({group_id:gId,is_active:true}).fetch();
   return allComments;
});
Template.registerHelper('fetch_total_member_in_group',function(){
    var allComments =  TotalMembers.find({}).fetch();
    return allComments;
});
Template.registerHelper('user_is_part_of_the_group',function(){
    return Session.get("user_is_part_of_the_group");
});
    

Template.registerHelper('fetch_all_members_which_are_in_the_group',function(){
    var newInvitees =  NewInvitees.find({}).fetch();
      return newInvitees;
});
Template.registerHelper('return_total_member_of_group',function(){
    var newInvitees =  TotalMembers.find({}).fetch();
    return newInvitees.length;
});
Template.registerHelper('already_invited_members',function(){
    var newInvitees =  AlreadyInvited.find({}).fetch();
    return newInvitees;
});

    
Template.registerHelper('check_if_user_is_admin',function(){
   let groupId = FlowRouter.current().params.groupId;
    let gId = Base64.decode(groupId);
    var allComments =  GroupDetails.find({group_id:gId,is_active:true,created_by:Utils.getLoggedInUserId()}).count();
   
    return allComments>0;
});

    
     