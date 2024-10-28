/*
 * Copyright 2021-2023 Solace Corporation. All rights reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

package com.solace.samples.java.snippets;


import com.solace.messaging.MessagingService;
import com.solace.messaging.config.profile.ConfigurationProfile;


/**
 * Sampler for usage of versioned configuration profile
 */
public class HowToUseVersionedConfigurationProfiles {


  /**
   * Example how to configure API with a specific configuration profile version
   *
   * @return connected instance of a messaging service, that uses first version of configuration
   * profile
   */
  public static MessagingService configureServiceWithConfigurationProfile() {

    return MessagingService.builder(ConfigurationProfile.V1).local().build().connect();
  }


}
