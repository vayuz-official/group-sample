import { GroupNetwork } from "../../../network/common/groups/GroupNetwork";
import { Utils } from "../../../utils/utils";
export const TotalMembers  = new Mongo.Collection(null);
export const  GroupDetails  = new Mongo.Collection(null);
export const  NewInvitees  = new Mongo.Collection(null);
export const  AlreadyInvited  = new Mongo.Collection(null);
export const AllUserConnections  = new Mongo.Collection(null);
export class GroupUtils{
      updateDiscussionCount(group_id,is_increment){
          var groupDetails = GroupDetails.find({group_id:group_id}).fetch();
          if(groupDetails.length!=0){
              if(is_increment){
                  GroupDetails.update({group_id:group_id},{$set:{total_discussions:parseInt(groupDetails[0].total_discussions) + 1}})
              }else{
                  GroupDetails.update({group_id:group_id},{$set:{total_discussions:parseInt(groupDetails[0].total_discussions) - 1}})
              }
          }
      }
     fetchGroupDetails(obj) {
        var isComingFromEditGroup = false; 
        if(obj.coming_from_edit_group){
            isComingFromEditGroup= true;
         }
        new GroupNetwork().fetchGroupDetailsBasedOnId(obj).then(function(data){
           if(data.data.code == 200){
             for(var i=0;i<data.data.group_details.length;i++){
               GroupDetails.insert({
                 Data: data.data.group_details[i].Data,
                 cover_image: data.data.group_details[i].cover_image,
                 created_at: data.data.group_details[i].created_at,
                 created_by: data.data.group_details[i].created_by,
                 group_description: data.data.group_details[i].group_description,
                 group_for: data.data.group_details[i].group_for,
                 group_id: data.data.group_details[i].group_id,
                 group_name: data.data.group_details[i].group_name,
                 total_discussions: data.data.group_details[i].total_discussions,
                 is_active: true
               });
               for(var j=0;j<data.data.group_details[i].all_members.length;j++){
                 if(data.data.group_details[i].all_members[j].status == 1){
                    if(data.data.group_details[i].all_members[j].user_details[0]){
                        TotalMembers.insert(data.data.group_details[i].all_members[j].user_details[0]);    
                    }  
                    
                 }else if(data.data.group_details[i].all_members[j].status == 0){
                     if(data.data.group_details[i].all_members[j].user_details[0]){
                        AlreadyInvited.insert(data.data.group_details[i].all_members[j].user_details[0]);
                     }
                 }
               }
               
               var obj = {};
               obj.user_id = Utils.getLoggedInUserId(); 
                new GroupNetwork().fetchAllUserConnections(obj).then(function(data){
           
                 if(data.data.code == 200){
                    for(var i=0;i<data.data.data.length;i++){
                     var checkIfAlreadyInvited = AlreadyInvited.find({user_id:data.data.data[i].user_id}).count();
                     var checkIfAlreadyMember = TotalMembers.find({user_id:data.data.data[i].user_id}).count();
                     if(checkIfAlreadyMember == 0 &&  checkIfAlreadyInvited == 0){
                         NewInvitees.insert(data.data.data[i]);
                     }

                     if(isComingFromEditGroup){
                        if(checkIfAlreadyInvited!=0 || checkIfAlreadyMember!=0){
                            AllUserConnections._collection.update({user_id:data.data.data[i].user_id},
                                {$set:{
                                is_selected: true
                            }});
                        }
                        
                     }
                    Blaze._globalHelpers.people_found(FlowRouter.current().queryParams.query);
                    }
                  }
                }).catch(function(e){
                    console.log("ExceptionExceptionExceptionException")
                  console.log(e);
                });
               
             }
           }
          }).catch(function(error){
            console.log("ExceptionExceptionExceptionException")
            console.log(error);
          })   
    }
    
}