//
//  cocos2dx_Storefront.cpp
//  cocos2dx-store
//
//  Created by Refael Dakar on 10/24/12.
//
//

#include "cocos2dx_Storefront.h"
#include "JniHelpers.h"

void cocos2dx_Storefront::openStore() {
	JniHelpers::jniCommonVoidCall(
		"openStore", 
		"com/soomla/cocos2dx/store/StorefrontBridge"
	);
}
