<?php
/*
Plugin Name: Bloginator api
description: provide api endpoint for bloginator app
Version: 1.0
Author: Bloginator
*/
   
   
add_action('rest_api_init', function () {
	
  register_rest_route( 'bloginator/v1', '/json/', array(
  
    'methods' => 'POST',
    
    'callback' => 'xml_config_details',
    
  ));
  
});

function xml_config_details($data) {
	
	$post_year = $_POST['year'];

	$post_api_key = $_POST['key'];
	
	$gxg_key = get_option( 'gxg_api_key' );
	
	$args = array(
	  'post_type'   => 'semesters',
	  'meta_query' => array(
			array(
				'key' => 'date_start',
				'value' => $post_year,
				'compare' => 'LIKE',
				'type' => 'NUMERIC',
				'posts_per_page' => -1,
			),
		)
	);
	
	$post_type = new WP_Query($args);
	
	if ( $post_api_key == $gxg_key ) {
		
		$gxg_interval = get_option( 'gxg_update_interval' );
		
		$max_image_height = get_option( 'options_bloginator_max_image_height' );
		
		$max_image_width = get_option( 'options_bloginator_max_image_width' );

		$config_details_value = array();
		
		$config_details_value["key"] = $gxg_key;
		
		$config_details_value["address"] = "https://seamester:D3vSit3xx@".$_SERVER['HTTP_HOST']."/gxg-import.php";
		
		$config_details_value["checkInterval"] = $gxg_interval;
		
		$config_details_value["wysiwyg"] = "1";
		
		if( $post_type->have_posts() ) {
						
			$i = -1;
		
			while ( $post_type->have_posts() ) {
				
				$i++;
				
				$post_type->the_post() ;
				
				$post_id = get_the_ID();
				
				$start_date = get_post_meta($post_id,'date_start',true);
				
				$end_date = get_post_meta($post_id,'date_end',true);
				
				$participants = get_post_meta($post_id,'bloginator_participants',true);
				
				$locations = get_post_meta($post_id,'bloginator_locations',true);
				
				$config_details_value["post_details"][$i]["max_photo_height"] = $max_image_height;
				
				$config_details_value["post_details"][$i]["max_photo_width"] = $max_image_width;
				
				$config_details_value["post_details"][$i]["id"] = $post_id;
				
				$config_details_value["post_details"][$i]["title"] = get_the_title();

				$config_details_value["post_details"][$i]["body"] = get_the_content();
				
				$config_details_value["post_details"][$i]["start_date"] = $start_date;
				
				$config_details_value["post_details"][$i]["end_date"] = $end_date;
				
				$config_details_value["post_details"][$i]["participants"] = $participants;
				
				$config_details_value["post_details"][$i]["locations"] = $locations;
			}
			
		}
		
		else {
			
			$config_details_value["post_details"] = [];
			
		}
		
		$config_details_value_json = json_encode($config_details_value); 
			
		echo ($config_details_value_json);
	
	}
	
	else {
		
		print_r('[]');
		
	}
	
		
	die();
	
}
   
?>
