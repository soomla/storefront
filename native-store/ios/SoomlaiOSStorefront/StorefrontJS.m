/*
 * Copyright (C) 2012 Soomla Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#import "StorefrontJS.h"
#import "InsufficientFundsException.h"
#import "StorefrontViewController.h"
#import "VirtualItemNotFoundException.h"
#import "StoreInfo.h"
#import "StorefrontInfo.h"
#import "VirtualCurrency.h"
#import "VirtualGood.h"
#import "StorageManager.h"
#import "VirtualCurrencyStorage.h"
#import "VirtualGoodStorage.h"
#import "JSONKit.h"
#import "StoreController.h"
#import "NotEnoughGoodsException.h"
#import "StorefrontController.h"


@implementation StorefrontJS

@synthesize sfViewController;

- (id)initWithStorefrontViewController:(StorefrontViewController*)sfvc{
    self = [super init];
    if (self){
        self.sfViewController = sfvc;

        @try {
            NSString *popFilePath = [[NSBundle mainBundle] pathForResource:@"theme/sounds/pop" ofType:@"mp3"];
            NSURL *soundFileURL = [NSURL fileURLWithPath:popFilePath];
            
            player = [[AVAudioPlayer alloc] initWithContentsOfURL:soundFileURL error:nil];
            player.volume = 1.0;
            player.numberOfLoops = 0;
        } @catch (NSException* e) {
            NSLog(@"Couldn't initialize sound player.");
        }
    }
    
    return self;
}

- (BOOL)webView:(UIWebView *)webView2 shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType {
    
	NSString *requestString = [[request URL] absoluteString];
	NSArray *components = [requestString componentsSeparatedByString:@":"];
    
	if ([components count] > 1 &&
		[(NSString *)[components objectAtIndex:0] isEqualToString:@"soomla"]) {
        
        /**
         * The user wants to buy a virtual currency pack.
         * productId is the product id of the pack.
         */
        if([(NSString *)[components objectAtIndex:1] isEqualToString:@"wantsToBuyMarketItem"])
		{
            NSString* productId = [components objectAtIndex:2];
            NSLog(@"wantsToBuyMarketItem %@", productId);
            
			@try {
            	[[StoreController getInstance] buyAppStoreItemWithProcuctId:productId];
			}
			
            @catch (VirtualItemNotFoundException *e) {
                NSLog(@"Couldn't find a VirtualCurrencyPack or NonConsumableItem with productId: %@. Purchase is cancelled.", productId);
                [sfViewController sendToJSWithAction:@"unexpectedError" andData:@""];
            }
        }
        
        /**
         * The user wants to buy a virtual good.
         * itemId is the item id of the virtual good.
         */
        if([(NSString *)[components objectAtIndex:1] isEqualToString:@"wantsToBuyVirtualGoods"])
		{
            NSString* itemId = [components objectAtIndex:2];
            NSLog(@"wantsToBuyVirtualGoods %@", itemId);
            
            @try {
                [[StoreController getInstance] buyVirtualGood:itemId];
            }
            
            @catch (InsufficientFundsException *e) {
                NSLog(@"%@", e.reason);
                
                [sfViewController sendToJSWithAction:@"insufficientFunds" andData:[NSString stringWithFormat:@"'%@'", e.itemId]];
            }
            
            @catch (VirtualItemNotFoundException *e) {
                NSLog(@"Couldn't find a VirtualGood with itemId: %@. Purchase is cancelled.", itemId);
                [sfViewController sendToJSWithAction:@"unexpectedError" andData:@""];
            }
        }
        
        /**
         * The user wants to equip a virtual good.
         * itemId is the item id of the virtual good.
         */
        if([(NSString *)[components objectAtIndex:1] isEqualToString:@"wantsToEquipGoods"])
		{
            NSString* itemId = [components objectAtIndex:2];
            NSLog(@"wantsToEquipGoods %@", itemId);
            
            @try {
                [[StoreController getInstance] equipVirtualGood:itemId];
            }
            
            @catch (NotEnoughGoodsException *e) {
                NSLog(@"%@", e.reason);
                
                [sfViewController sendToJSWithAction:@"notEnoughGoods" andData:[NSString stringWithFormat:@"'%@'", itemId]];
            }
            
            @catch (VirtualItemNotFoundException *e) {
                NSLog(@"Couldn't find a VirtualGood with itemId: %@. Equipping is cancelled.", itemId);
                [sfViewController sendToJSWithAction:@"unexpectedError" andData:@""];
            }
        }
        
        /**
        * The user wants to unequip a virtual good.
        * itemId is the item id of the virtual good.
        */
        if([(NSString *)[components objectAtIndex:1] isEqualToString:@"wantsToUnequipGoods"])
		{
            NSString* itemId = [components objectAtIndex:2];
            NSLog(@"wantsToUnequipGoods %@", itemId);
            
            @try {
                [[StoreController getInstance] unequipVirtualGood:itemId];
            }
            
            @catch (VirtualItemNotFoundException *e) {
                NSLog(@"Couldn't find a VirtualGood with itemId: %@. UnEquipping is cancelled.", itemId);
                [sfViewController sendToJSWithAction:@"unexpectedError" andData:@""];
            }
        }
        
        /**
         * The user wants to leave the store.
         * Clicked on "close" button.
         */
        if([(NSString *)[components objectAtIndex:1] isEqualToString:@"wantsToLeaveStore"])
		{
            NSLog(@"wantsToLeaveStore");
            
            [sfViewController closeStore];
        }
        
        /**
         * The store's storefront is ready to receive calls.
         */
		if([(NSString *)[components objectAtIndex:1] isEqualToString:@"uiReady"])
		{
            NSLog(@"uiReady");
            
            sfViewController.jsUIReady = YES;
            
            NSMutableDictionary* storeInfoDict = [NSMutableDictionary dictionaryWithDictionary:[[StoreInfo getInstance] toDictionary]];
            NSDictionary* storefrontInfoDict = [[StorefrontInfo getInstance] toDictionary];
            
            for (NSString* key in storefrontInfoDict.allKeys){
                [storeInfoDict setObject:[storefrontInfoDict objectForKey:key] forKey:key];
            }
            
            NSString* initJSON = [storeInfoDict JSONString];
            
            NSLog(@"initializing JS with JSON: %@", initJSON);
            [sfViewController sendToJSWithAction:@"initialize" andData:initJSON];
            
            [self updateContentInJS];
		}
        
        /**
         * The store is initialized (everything is loaded and ready for the user).
         */
        if([(NSString *)[components objectAtIndex:1] isEqualToString:@"storeInitialized"])
		{
            NSLog(@"storeInitialized");
            
            [sfViewController loadWebView];
        }
        
        /**
         * Plays a "pop" sound
         */
        if([(NSString *)[components objectAtIndex:1] isEqualToString:@"playPop"])
		{
            if (player) {
                [player play];
            }
        }

        
		return NO;
	}
    
	return YES; // Return YES to make sure regular navigation works as expected.
}

- (void)updateContentInJS{
	[[StorefrontController getInstance] updateCurrenciesBalanceOnScreen];
	[[StorefrontController getInstance] updateGoodsBalanceOnScreen];
	[[StorefrontController getInstance] updateNonConsumableItemsStateOnScreen];
}

@end
