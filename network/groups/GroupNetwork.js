const axios = require('axios').default;

export class GroupNetwork{

    async  fetchAllUserConnections(obj){
        var data = await axios.post(Meteor.absoluteUrl()+'fetch_all_user_connections', obj);
        return data;
    }

    async  fetchAllGroups(obj){
        var data = await axios.post(Meteor.absoluteUrl()+'fetch_all_groups', obj);
        return data;
    }
 
     async fetchAllGroupsCount(obj){
        var data = await axios.post(Meteor.absoluteUrl()+'fetch_all_groups_count', obj);
        return data;
    }
    async changeInviteStatus(obj){
        var data = await axios.post(Meteor.absoluteUrl()+'changeInviteStatus',obj);
        return data;        
    }
    async fetchGroupDetailsBasedOnId(obj){
        var data = await axios.post(Meteor.absoluteUrl()+'fetch_group_details_based_on_id',obj);
        return data;        
    }
    
    async fetchAllGroupsDiscussions(obj){
        var data = await axios.post(Meteor.absoluteUrl()+'fetch_all_group_discussions',obj);
        return data;        
    }
    
    async fetchAllDiscussionLikes(obj){
        var data = await axios.post(Meteor.absoluteUrl()+'fetch_all_discussion_likes',obj);
        return data;        
    }
    
    async fetchDiscussionBasedOnId(obj){
        var data = await axios.post(Meteor.absoluteUrl()+'fetch_discussion_based_on_id',obj);
        return data;        
    }
 
		
}
