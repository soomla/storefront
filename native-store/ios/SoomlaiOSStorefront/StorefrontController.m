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
#import "JSONKit.h"
#import "StorefrontInfo.h"

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

- (void)openStoreWithParentViewController:(UIViewController *)viewController andStorefrontInfoJSON:(NSString*)storefrontJSON{

    [[StorefrontInfo getInstance] initializeWithJSON:storefrontJSON];
    
//    UIStoryboard *storyboard = [viewController storyboard];
    sfViewController = [[StorefrontViewController alloc] init];
    
    [viewController presentViewController:sfViewController animated:YES completion:nil];
    
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(virtualCurrencyPackPurchased:) name:EVENT_VIRTUAL_CURRENCY_PACK_PURCHASED object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(virtualGoodPurchased:) name:EVENT_VIRTUAL_GOOD_EQUIPPED object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(virtualGoodEquipped:) name:EVENT_VIRTUAL_GOOD_UNEQUIPPED object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(virtualGoodUnEquipped:) name:EVENT_VIRTUAL_GOOD_PURCHASED object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(billingNotSupported:) name:EVENT_BILLING_NOT_SUPPORTED object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(closingStore:) name:EVENT_CLOSING_STORE object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(unexpectedError:) name:EVENT_UNEXPECTED_ERROR_IN_STORE object:nil];
}

- (void)virtualCurrencyPackPurchased:(NSNotification*)notification{
    NSDictionary* userInfo = notification.userInfo;
    VirtualCurrencyPack* pack = [userInfo objectForKey:@"VirtualCurrencyPack"];
    VirtualCurrency* currency = pack.currency;
    
    int balance = [[[StorageManager getInstance] virtualCurrencyStorage] getBalanceForCurrency:currency];
    NSDictionary* currencyBalanceDict = [NSDictionary dictionaryWithObjectsAndKeys:
                                         [NSNumber numberWithInt:balance], currency.itemId,
                                         nil];
    [sfViewController sendToJSWithAction:@"currencyBalanceChanged" andData:[currencyBalanceDict JSONString]];
}

- (void)virtualGoodPurchased:(NSNotification*)notification{
    [sfViewController.storefrontJS updateContentInJS];
}

- (void)virtualGoodEquipped:(NSNotification*)notification{
    [sfViewController.storefrontJS updateContentInJS];
}

- (void)virtualGoodUnEquipped:(NSNotification*)notification{
    [sfViewController.storefrontJS updateContentInJS];
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
