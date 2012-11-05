//
//  cocos2dx_Storefront.cpp
//  cocos2dx-store
//
//  Created by Refael Dakar on 10/24/12.
//
//

#include "cocos2dx_Storefront.h"
#import "StorefrontController.h"
#import "AppController.h"

void cocos2dx_Storefront::openStore() {
    [[StorefrontController getInstance] openStoreWithParentViewController:[AppController rootViewController]];
}
