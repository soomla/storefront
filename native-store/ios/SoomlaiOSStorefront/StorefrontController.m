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

#import "StorefrontController.h"
#import "StorefrontViewController.h"
#import "EventHandling.h"
#import "StorefrontJS.h"
#import "VirtualCurrency.h"
#import "VirtualCurrencyPack.h"
#import "StorageManager.h"
#import "VirtualCurrencyStorage.h"
#import "NonConsumableStorage.h"
#import "VirtualGoodStorage.h"	 
#import "VirtualGood.h"
#import "JSONKit.h"
#import "StorefrontInfo.h"
#import "AppStoreItem.h"
#import "StoreInfo.h"
#import "VirtualItemNotFoundException.h"

@implementation StorefrontController

@synthesize sfViewController;

+ (StorefrontController*)getInstance{
    static StorefrontController* _instance = nil;
    
    @synchronized( self ) {
        if( _instance == nil ) {
            _instance = [[StorefrontController alloc ] init];
        }
    }
    
    return _instance;
}

- (void)openStoreWithParentViewController:(UIViewController *)viewController{

    NSString *jsonPath = [[NSBundle mainBundle] pathForResource:@"theme" ofType:@"json"];
    NSString *json = [NSString stringWithContentsOfFile:jsonPath encoding:NSUTF8StringEncoding error:nil];
    
    [[StorefrontInfo getInstance] initializeWithJSON:json];
    
//    UIStoryboard *storyboard = [viewController storyboard];
    sfViewController = [[StorefrontViewController alloc] init];
    
    [viewController presentViewController:sfViewController animated:YES completion:nil];
    
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(appStoreItemPurchased:) name:EVENT_APPSTORE_PURCHASED object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(virtualGoodPurchased:) name:EVENT_VIRTUAL_GOOD_EQUIPPED object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(virtualGoodEquipped:) name:EVENT_VIRTUAL_GOOD_UNEQUIPPED object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(billingNotSupported:) name:EVENT_BILLING_NOT_SUPPORTED object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(closingStore:) name:EVENT_CLOSING_STORE object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(unexpectedError:) name:EVENT_UNEXPECTED_ERROR_IN_STORE object:nil];
	[[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(curBalanceChanged:) name:EVENT_CHANGED_CURRENCY_BALANCE object:nil];
	[[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(goodBalanceChanged:) name:EVENT_CHANGED_GOOD_BALANCE object:nil];
}

- (void)updateCurrenciesBalanceOnScreen {
    NSMutableDictionary* currenciesDict = [[NSMutableDictionary alloc] init];
    for(VirtualCurrency* currency in [[StoreInfo getInstance] virtualCurrencies]){
        int balance = [[[StorageManager getInstance] virtualCurrencyStorage] getBalanceForCurrency:currency];
        [currenciesDict setValue:[NSNumber numberWithInt:balance] forKey:currency.itemId];
    }
    
    [sfViewController sendToJSWithAction:@"currencyBalanceChanged" andData:[currenciesDict JSONString]];
}

- (void)updateGoodsBalanceOnScreen {
    NSMutableDictionary* goodsDict = [[NSMutableDictionary alloc] init];
    for(VirtualGood* good in [[StoreInfo getInstance] virtualGoods]){
        int balance = [[[StorageManager getInstance] virtualGoodStorage] getBalanceForGood:good];
        BOOL equipped = [[[StorageManager getInstance] virtualGoodStorage] isGoodEquipped:good];
        NSDictionary* updatedValues = [NSDictionary dictionaryWithObjectsAndKeys:
                                       [NSNumber numberWithInt:balance], @"balance",
                                       [good currencyValues], @"price",
                                       [NSNumber numberWithBool:equipped], @"equipped",
                                       nil];
        [goodsDict setValue:updatedValues forKey:good.itemId];
    }

    [sfViewController sendToJSWithAction:@"goodsUpdated" andData:[goodsDict JSONString]];
}

- (void)updateNonConsumableItemsStateOnScreen {
    NSMutableDictionary* nonConsDict = [[NSMutableDictionary alloc] init];
    for (AppStoreItem* apItem in [[StoreInfo getInstance] appStoreNonConsumableItems]) {
        BOOL exists = [[[StorageManager getInstance] nonConsumableStorage] nonConsumableExists:apItem];
        NSDictionary* updatedValues = [NSDictionary dictionaryWithObjectsAndKeys:
                                       [NSNumber numberWithBool:exists], @"owned",
                                       nil];
        [nonConsDict setValue:updatedValues forKey:apItem.productId];
    }
	
	[sfViewController sendToJSWithAction:@"nonConsumablesUpdated" andData:[nonConsDict JSONString]];
}

- (void)updateSingleAppStoreItemOnScreen:(NSString*)productId {
	@try {
    	VirtualCurrencyPack* pack = [[StoreInfo getInstance] currencyPackWithProductId:productId];
    	VirtualCurrency* currency = pack.currency;

    	int balance = [[[StorageManager getInstance] virtualCurrencyStorage] getBalanceForCurrency:currency];
    	NSDictionary* currencyBalanceDict = [NSDictionary dictionaryWithObjectsAndKeys:
                                         [NSNumber numberWithInt:balance], currency.itemId,
                                         nil];
		[sfViewController sendToJSWithAction:@"currencyBalanceChanged" andData:[currencyBalanceDict JSONString]];
	}
	
    @catch (VirtualItemNotFoundException *e) {
		@try {
			AppStoreItem* apItem = [[StoreInfo getInstance] appStoreNonConsumableItemWithProductId:productId];
		
		    NSMutableDictionary* nonConsDict = [[NSMutableDictionary alloc] init];
		    BOOL exists = [[[StorageManager getInstance] nonConsumableStorage] nonConsumableExists:apItem];
		    NSDictionary* updatedValues = [NSDictionary dictionaryWithObjectsAndKeys:
		                                   [NSNumber numberWithBool:exists], @"owned",
		                                   nil];
		    [nonConsDict setValue:updatedValues forKey:productId];
		
			[sfViewController sendToJSWithAction:@"nonConsumablesUpdated" andData:[nonConsDict JSONString]];
		}
		
		@catch (VirtualItemNotFoundException *e) {
	        NSLog(@"Couldn't find an AppStore Item with productId: %@. Purchase is cancelled.", productId);
	        [sfViewController sendToJSWithAction:@"unexpectedError" andData:@""];
		}
    }
}

- (void)appStoreItemPurchased:(NSNotification*)notification{
    NSDictionary* userInfo = notification.userInfo;
    AppStoreItem* apItem = [userInfo objectForKey:@"AppStoreItem"];
	[self updateSingleAppStoreItemOnScreen:apItem.productId];
}

- (void)curBalanceChanged:(NSNotification*)notification{
    [self updateCurrenciesBalanceOnScreen];
}

- (void)goodBalanceChanged:(NSNotification*)notification{
    [self updateGoodsBalanceOnScreen];
}

- (void)virtualGoodEquipped:(NSNotification*)notification{
    [self updateGoodsBalanceOnScreen];
}

- (void)virtualGoodUnEquipped:(NSNotification*)notification{
    [self updateGoodsBalanceOnScreen];
}

- (void)billingNotSupported:(NSNotification*)notification{
    [sfViewController sendToJSWithAction:@"disableCurrencyStore" andData:@""];
}

- (void)closingStore:(NSNotification*)notification{
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)unexpectedError:(NSNotification*)notification{
    [sfViewController sendToJSWithAction:@"unexpectedError" andData:@""];
}

@end
