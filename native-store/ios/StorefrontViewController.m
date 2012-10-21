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

#import "StorefrontViewController.h"
#import "StoreController.h"
#import "StorefrontJS.h"
#import "StorefrontInfo.h"

@interface StorefrontViewController ()

@end

@implementation StorefrontViewController

@synthesize storeWebview, pendingMessages, jsUIReady, storefrontJS;

- (void)viewDidLoad
{
    [super viewDidLoad];
    
    activity = [[UIActivityIndicatorView alloc] initWithActivityIndicatorStyle:UIActivityIndicatorViewStyleWhiteLarge];
    activity.frame = self.view.frame;
    [activity startAnimating];
    [self.view addSubview:activity];

    pendingMessages = [[NSMutableArray alloc] init];
    jsUIReady = NO;
    
    self.storefrontJS = [[StorefrontJS alloc] initWithStorefrontViewController:self];
    
    [[StoreController getInstance] storeOpening];
    
    /* Setting up the store WebView */
    storeWebview = [[UIWebView alloc] initWithFrame:self.view.frame];
    storeWebview.delegate = self.storefrontJS;
    storeWebview.userInteractionEnabled = YES;
    NSURL *url = [NSURL fileURLWithPath:[[NSBundle mainBundle] pathForResource:@"store" ofType:@"html" inDirectory:@"soomla_ui"]];
    [storeWebview loadRequest:[NSURLRequest requestWithURL:url]];

}

- (void)closingStore:(NSNotification*)notification{
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

-(BOOL)shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation)toInterfaceOrientation{
    if ([[StorefrontInfo getInstance] orientationLandscape]){
        return UIInterfaceOrientationIsLandscape(toInterfaceOrientation);
    }

    return UIInterfaceOrientationIsPortrait(toInterfaceOrientation);
}

- (void)loadWebView{
    [self.view addSubview:storeWebview];
    [self.view bringSubviewToFront:storeWebview];
    
    [activity stopAnimating];
}

- (void)sendToJSWithAction:(NSString*)action andData:(NSString*)data{
    NSString* urlToLoad = [NSString stringWithFormat:@"SoomlaJS.%@(%@)", action, data];
    
    if (!jsUIReady){
        [pendingMessages addObject:urlToLoad];
    }
    else{
        NSLog(@"sending message to JS: %@", urlToLoad);
        
        [storeWebview stringByEvaluatingJavaScriptFromString:urlToLoad];
        
        while (pendingMessages.count > 0) {
            NSString* tmpPendingUrl = [pendingMessages objectAtIndex:0];
            [pendingMessages removeObjectAtIndex:0];

            NSLog(@"sending message to JS: %@", tmpPendingUrl);
            [storeWebview stringByEvaluatingJavaScriptFromString:tmpPendingUrl];
        }
    }
}

- (void)closeStore{
    [[StoreController getInstance] storeClosing];
    [storeWebview removeFromSuperview];
    [self dismissViewControllerAnimated:YES completion:nil];
}


- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

@end
